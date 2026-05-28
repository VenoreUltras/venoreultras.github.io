// src/state/trainingStore.js
// Centralny store stanu szkolenia (STATE-01). Jedyne mutowalne wspólne state'a.
// NIE importuje THREE/DOM/gsap (boundaries.test.js enforce w Plan 05).
//
// D-08: timer rozpędu odpalany jest TUTAJ (przez injectable scheduleTimer),
// nie w ProcedureEngine — engine pozostaje pure, emituje deklaratywny effect
// `{type:'startSpinUpTimer', ms}`, a store tłumaczy go na setTimeout.

import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { validateStep, evaluateFaultRules } from '../training/ProcedureEngine.js';
import { faultRules } from '../training/faultRules.js';

/**
 * Tworzy nową instancję store'a. Phase 1 wpina go w Application;
 * Phase 4 będzie dodawał subscriberów przez panele DOM.
 *
 * @param {object} [opts]
 * @param {() => number} [opts.now]            - injectable clock (test override)
 * @param {(fn:Function, ms:number) => any} [opts.scheduleTimer]  - injectable timer
 * @returns {ReturnType<typeof createStore>}
 */
export function createTrainingStore(opts = {}) {
  const now = opts.now ?? (() => Date.now());
  const scheduleTimer = opts.scheduleTimer ?? ((fn, ms) => setTimeout(fn, ms));

  const store = createStore(
    subscribeWithSelector((set, get) => ({
      // Phase 6 D-Phase6-09: attempts[] list (push przy retry()); retryCount = attempts.length.
      session: { scenarioId: null, startedAt: null, finishedAt: null, attempts: [], retryCount: 0 },
      // Phase 6 Pitfall 1 — Application setCurrentAngle per simulationTick (Plan 06-08).
      // Wstrzykiwane do step.done / step.violation eventów w applyEffects (dla replay 3D).
      _currentAngle: 0,
      currentStepId: null,
      steps: {},
      machineState: 'oczekiwanie-na-inspekcje',
      meshStates: {},
      events: [],
      scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
      // D-Phase3-02: store cache'uje pełen scenario object — attemptStep(intent) (1-arg).
      activeScenario: null,
      // D-Phase3-14 / CRIT-8 / INTERACT-05: lock blokuje równoległe attemptStep
      // (np. burst pointerdown podczas walidacji). Set true w try, false w finally.
      isAnimating: false,
      // D-Phase4-09: single runtime source dla high-contrast outline mode.
      // Persist warstwa to localStorage 'pm300:hc-outline:v1' — bootstrap w Application
      // (Plan 04-06) odczytuje persist i wywołuje setState({ hcOutlineMode: ... }).
      // Default false (większość użytkowników bez wymagania HC). Flag NIE jest resetowany
      // przez startScenario — to user preference, nie scenario state.
      hcOutlineMode: false,
      // D-Phase5-01: trzy ortogonalne flagi dydaktyczne (single source of truth).
      // Persist warstwa: Application bootstrap (Plan 05-07), analogicznie jak hcOutlineMode.
      // 'nauka' domyślnie (D-Phase5-04); freeRoam NIE jest persistowany (eksploracja).
      difficulty: 'nauka',
      freeRoam: false,
      // D-Phase5-01: stan aktywnego modalu — null lub 'help' lub 'confirm-scenario-switch'.
      // Pauza animacji gdy activeModal !== null (Plan 05-07 — gsap ticker predicate).
      activeModal: null,
      // D-Phase5-18: globalny mute audio — persist w 'pm300:audio-mute:v1' przez Application.
      audioMuted: false,
      // D-Phase5-10: toggle etykiet 3D przez klawisz L (KeyboardController Plan 05-03).
      labelsVisible: false,
      // Tryb etykiet: false=wszystkie naraz, true=tylko pod kursorem (hover).
      labelsHoverOnly: false,
      // Wewnętrzny payload dla ConfirmModal (Plan 05-03) — nie eksponowany w UI bezpośrednio.
      _confirmPayload: null,
      // Phase 6 Plan 06-04 (D-Phase6-07, EDU-04): widoczność replay drawera + indeks attemptu.
      // ReplayDrawer subskrybuje replayOpen i ładuje session.attempts[replayAttemptIdx]
      // do ReplayEngine. SessionOverlay (Plan 06-07) wywoła openReplay(attemptIdx) z button.
      replayOpen: false,
      replayAttemptIdx: 0,
      // Phase 6 Plan 06-05 (D-Phase6-04): stan progress baru .bimanual-hint w StepPanel.
      // 'idle' | 'active' | 'timeout' | 'success'. RaycastController (Plan 06-05 Task 2)
      // toggle'uje wartości; StepPanel subskrybuje i zmienia klasy CSS bez full re-render.
      bimanualHintState: 'idle',
      _now: now,
      _spinUpTimerHandle: null,

      startScenario: (scenario) => {
        set({
          // D-Phase3-02: zapisujemy pełen obiekt scenariusza (nie tylko id) — attemptStep
          // sięgnie po niego z state, dzięki czemu warstwa wywołująca (RaycastController,
          // testy) nie musi już przekazywać scenario jako argument.
          activeScenario: scenario,
          // Phase 6 D-Phase6-09: attempts=[] na świeży start; retry() pushuje.
          session: { scenarioId: scenario.id, startedAt: now(), finishedAt: null, attempts: [], retryCount: 0 },
          steps: Object.fromEntries(scenario.steps.map(s => [s.id, { status: 'pending' }])),
          currentStepId: scenario.steps[0].id,
          machineState: scenario.initialMachineState ?? 'oczekiwanie-na-inspekcje',
          // Phase 6 Plan 06-03 Task 2: initialMeshStates pretext dla scenariusza awaria
          // (oslona-przednia='open' + machineState='w-cyklu' → faultRule odpala).
          meshStates: scenario.initialMeshStates ? { ...scenario.initialMeshStates } : {},
          events: [{ type: 'session.start', scenarioId: scenario.id, timestamp: now() }],
          scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
          // Phase 6 Plan 06-05: reset hint na świeży scenariusz.
          bimanualHintState: 'idle',
        });
        // Phase 6 Plan 06-03 Task 2: ewaluuj faultRules na initial state by initialMeshStates
        // triggujące fault rule (np. awaria) natychmiast ustawiły machineState='awaria-os-otwarta'.
        // Application Plan 06-08 nie musi już manualnie wołać evaluateFaultRules.
        const faultEffects = evaluateFaultRules(get(), faultRules);
        if (faultEffects.length > 0) {
          applyEffects(set, get, faultEffects, scheduleTimer);
        }
      },

      // D-Phase3-02: sygnatura 1-argumentowa — scenariusz pochodzi z state.activeScenario.
      // D-Phase3-14: isAnimating lock + try/finally. Lock NIE obejmuje 3-sekundowego
      // rozpędu (timer odpalany przez scheduleTimer jest niezależny od attemptStep).
      attemptStep: (intent) => {
        const state = get();
        if (state.isAnimating) return; // CRIT-8: blokuje równoległy klik mid-walidacja
        // Graceful no-op gdy startScenario jeszcze nie wywołany — attemptStep
        // wywołany "zbyt wcześnie" (np. RaycastController odpalony przed Application
        // auto-start) nie może rzucić. ProcedureEngine wymaga scenario.steps.find().
        if (!state.activeScenario) return;
        set({ isAnimating: true });
        try {
          const result = validateStep(intent, state, state.activeScenario);
          applyEffects(set, get, result.effects, scheduleTimer);
          // Fault rules na nowym state (PO applied effects)
          const faultEffects = evaluateFaultRules(get(), faultRules);
          if (faultEffects.length > 0) {
            applyEffects(set, get, faultEffects, scheduleTimer);
          }
        } finally {
          set({ isAnimating: false }); // zawsze zwalniamy, nawet gdy validateStep rzuci
        }
      },

      _onSpinUpComplete: () => set(s => ({
        machineState: 'gotowa-do-pracy',
        events: [...s.events, { type: 'session.spinUp.done', timestamp: now() }],
      })),

      // ── Phase 5: akcje dydaktyczne (D-Phase5-01..18) ──────────────────────────
      // UWAGA: żadna z tych akcji NIE pisze do localStorage — persist = Application bootstrap.

      /** Ustawia tryb trudności ('nauka' | 'egzamin'). D-Phase5-01/02/04. */
      setDifficulty: (mode) => set({ difficulty: mode }),

      /** Przełącza tryb swobodnej eksploracji. D-Phase5-05. */
      toggleFreeRoam: () => set(s => ({ freeRoam: !s.freeRoam })),

      /**
       * Przełącza modal pomocy (help overlay). D-Phase5-23.
       * null → 'help'; 'help' → null (toggle).
       */
      toggleHelp: () => set(s => ({
        activeModal: s.activeModal === 'help' ? null : 'help',
      })),

      /** Zamyka dowolny aktywny modal. D-Phase5-20 (Esc precedencja). */
      closeModal: () => set({ activeModal: null, _confirmPayload: null }),

      /**
       * Otwiera modal potwierdzenia zmiany scenariusza. D-Phase5-07.
       * @param {{ current: string, next: string }} payload
       */
      openConfirmModal: (payload) => set({
        activeModal: 'confirm-scenario-switch',
        _confirmPayload: payload,
      }),

      /** Przełącza globalny mute audio. D-Phase5-18. */
      toggleMute: () => set(s => ({ audioMuted: !s.audioMuted })),

      /** Przełącza widoczność etykiet 3D. D-Phase5-10. */
      toggleLabels: () => set(s => ({ labelsVisible: !s.labelsVisible })),

      /** Przełącza tryb hover-only dla etykiet 3D. */
      toggleLabelsHoverOnly: () => set(s => ({ labelsHoverOnly: !s.labelsHoverOnly })),

      /**
       * Resetuje aktywny scenariusz do stanu początkowego. D-Phase5-05.
       * No-op gdy activeScenario === null.
       */
      resetScenario: () => {
        const scenario = get().activeScenario;
        if (!scenario) return;
        get().startScenario(scenario);
      },

      // ── Phase 6: extensions (D-Phase6-04/05/09/12 + Pitfall 1) ───────────────

      /**
       * Ustawia bieżący kąt wału (Pitfall 1). Application woła per simulationTick
       * (Plan 06-08). Wartość wstrzykiwana do step.done/step.violation eventów
       * przez applyEffects appendEvent branch.
       * @param {number} angle - radiany
       */
      setCurrentAngle: (angle) => set({ _currentAngle: angle }),

      /**
       * D-Phase6-09: nowa próba scenariusza. Pushuje aktualny attempt do
       * session.attempts[], resetuje runtime state (steps/events/scoring/machineState),
       * ZACHOWUJE session.startedAt (timeline cross-attempt).
       * No-op gdy activeScenario === null.
       */
      retry: () => {
        const state = get();
        if (!state.activeScenario) return;
        const t = now();
        const scenario = state.activeScenario;
        const currentAttempt = {
          attemptIdx: state.session.attempts.length,
          startedAt: state.session.startedAt ?? t,
          finishedAt: t,
          events: [...state.events],
          scoring: { ...state.scoring },
        };
        const newAttempts = [...state.session.attempts, currentAttempt];
        set({
          session: {
            scenarioId: state.session.scenarioId,
            startedAt: state.session.startedAt,
            finishedAt: null,
            attempts: newAttempts,
            retryCount: newAttempts.length,
          },
          steps: Object.fromEntries(scenario.steps.map(s => [s.id, { status: 'pending' }])),
          currentStepId: scenario.steps[0].id,
          machineState: scenario.initialMachineState ?? 'oczekiwanie-na-inspekcje',
          meshStates: {},
          events: [{ type: 'session.start', scenarioId: state.session.scenarioId, timestamp: t }],
          scoring: { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
          // Phase 6 Plan 06-05: reset hint na nowy attempt.
          bimanualHintState: 'idle',
        });
      },

      /**
       * Phase 6 Plan 06-05 (D-Phase6-04): setter dla progress baru .bimanual-hint.
       * RaycastController (Task 2) woła z 'active' przy pierwszym kliku,
       * 'timeout' po 500ms, 'success' po drugim kliku w window, 'idle' po fadeout.
       * @param {'idle'|'active'|'timeout'|'success'} value
       */
      setBimanualHintState: (value) => set({ bimanualHintState: value }),

      /**
       * D-Phase6-04: bimanual step intent — jednoczesny klik 2 meshy w window.
       * Lock pattern identyczny do attemptStep (CRIT-8).
       * @param {{firstMeshId:string, firstTimestamp:number, secondMeshId:string, secondTimestamp:number}} intent
       */
      attemptBimanualStep: (intent) => {
        const state = get();
        if (state.isAnimating) return;
        if (!state.activeScenario) return;
        set({ isAnimating: true });
        try {
          const fullIntent = { kind: 'bimanual', ...intent };
          const result = validateStep(fullIntent, state, state.activeScenario);
          applyEffects(set, get, result.effects, scheduleTimer);
          const faultEffects = evaluateFaultRules(get(), faultRules);
          if (faultEffects.length > 0) applyEffects(set, get, faultEffects, scheduleTimer);
        } finally {
          set({ isAnimating: false });
        }
      },

      /**
       * D-Phase6-05: machineStateAttest — sprawdza czy bieżący machineState
       * matchuje targetMachineState aktualnego kroku. No-op gdy nie matchuje
       * (ProcedureEngine zwraca reason='machine-state-not-matching').
       * Wywoływany przez store-level subscriber na zmianę machineState.
       */
      attemptMachineStateAttest: () => {
        const state = get();
        // UWAGA: subscriber wywołuje tę akcję SYNCHRONICZNIE z set({machineState})
        // wewnątrz applyEffects gdzie isAnimating === true. Dlatego NIE używamy
        // isAnimating guard tutaj — re-entrancy jest bezpieczna bo machineStateAttest
        // ma własną advanceStep idempotency (Phase 3 D-Phase3-14).
        if (!state.activeScenario) return;
        const intent = { kind: 'machineStateCheck' };
        const result = validateStep(intent, state, state.activeScenario);
        applyEffects(set, get, result.effects, scheduleTimer);
        const faultEffects = evaluateFaultRules(get(), faultRules);
        if (faultEffects.length > 0) applyEffects(set, get, faultEffects, scheduleTimer);
      },

      /**
       * D-Phase6-12: deserializuje persisted snapshot (validator żyje w
       * persistence module Plan 06-06). Tu tylko set bez walidacji.
       * @param {{session:object, scoring?:object, events?:Array}} snapshot
       */
      loadPersistedSession: (snapshot) => set({
        session: snapshot.session,
        scoring: snapshot.scoring ?? { score: 100, criticalCount: 0, mediumCount: 0, minorCount: 0 },
        events: snapshot.events ?? [],
      }),

      /**
       * D-Phase6-07: otwiera replay drawer dla wybranego attemptu.
       * SessionOverlay (Plan 06-07) wywoła z button "Otwórz replay".
       * @param {number} attemptIdx - indeks w session.attempts[]
       */
      openReplay: (attemptIdx = 0) => set({ replayOpen: true, replayAttemptIdx: attemptIdx }),

      /** D-Phase6-07: zamyka replay drawer (X button lub session reset). */
      closeReplay: () => set({ replayOpen: false }),

      /**
       * D-Phase6-09: zamyka sesję ustawiając finishedAt. Wywoływany automatycznie
       * przez store-level subscriber na currentStepId === null transition,
       * lub ręcznie przy fault triggered (Plan 06-08).
       */
      finishSession: () => set(s => ({
        session: { ...s.session, finishedAt: now() },
      })),
    }))
  );

  // ── Phase 6 Plan 06-02: store-level subscribery (analog _onSpinUpComplete wzorca) ──
  //
  // UWAGA: Te subscribery NIE są dispose'owalne przez Application — żyją tyle co
  // store (createTrainingStore jest fabryczne; replay engine tworzy własną instancję
  // dla deterministic re-execution, swój subscriber też się ubije razem ze storem).
  //
  // EDGE CASE: jeśli scenariusz ma JEDEN step kind='machineStateAttest' jako PIERWSZY
  // krok, subscriber NIE odpali się przy initial startScenario (machineState ustawiany
  // synchronicznie w startScenario.set, ale subscriber czeka na CHANGE od poprzedniej
  // wartości). Rozwiązanie: Plan 06-08 Application bootstrap wywoła
  // attemptMachineStateAttest() po startScenario IF currentStep.kind === 'machineStateAttest'.

  // D-Phase6-05: machineStateAttest auto-trigger — dwa kanały:
  //   (a) zmiana machineState: wał osiągnął target podczas attestu → advance
  //   (b) zmiana currentStepId: poprzedni krok advansował na machineStateAttest którego
  //       target już matchuje bieżący machineState → advance natychmiast
  const _tryAttest = () => {
    const s = store.getState();
    const step = s.activeScenario?.steps?.find(x => x.id === s.currentStepId);
    if (step?.kind === 'machineStateAttest') s.attemptMachineStateAttest();
  };
  store.subscribe((s) => s.machineState, _tryAttest);
  store.subscribe((s) => s.currentStepId, _tryAttest);

  // D-Phase6-09: finishSession auto-trigger gdy currentStepId staje się null
  // (advanceStep przeszedł poza ostatni krok). Idempotency: nie nadpisuj finishedAt
  // jeśli już ustawione (chroni przed ponownym set'em np. retry → 1-step scenario edge).
  store.subscribe(
    (s) => s.currentStepId,
    (currentStepId, prevStepId) => {
      const s = store.getState();
      if (currentStepId === null && prevStepId !== null && s.session.finishedAt === null) {
        s.finishSession();
      }
    }
  );

  return store;
}

/**
 * Aplikuje effects array do store'a. Pure reducer dispatch.
 * D-02 closed type set: setMachineState, setMeshState, appendEvent,
 * advanceStep, startSpinUpTimer, playAudio.
 */
function applyEffects(set, get, effects, scheduleTimer) {
  for (const effect of effects) {
    switch (effect.type) {
      case 'setMachineState':
        set({ machineState: effect.value });
        break;
      case 'setMeshState':
        set(s => ({ meshStates: { ...s.meshStates, [effect.meshId]: effect.value } }));
        break;
      case 'appendEvent': {
        // Phase 6 Pitfall 1 — step.done / step.violation potrzebują angle dla replay 3D.
        // Pozostałe typy (session.start, fault.triggered, session.spinUp.done, step.note) bez angle.
        const ev = (effect.event.type === 'step.done' || effect.event.type === 'step.violation')
          ? { ...effect.event, angle: get()._currentAngle }
          : effect.event;
        set(s => ({ events: [...s.events, ev] }));
        if (ev.severity) {
          set(s => ({ scoring: applyScoringEvent(s.scoring, ev.severity) }));
        }
        break;
      }
      case 'setStepStatus':
        set(s => ({ steps: { ...s.steps, [effect.stepId]: { status: effect.status } } }));
        break;
      case 'advanceStep': {
        const state = get();
        if (!state.currentStepId) break;
        // D-Phase3-14 idempotency guard: jeśli aktualny step jest już 'done',
        // drugi advanceStep dla tego samego id NIE przesuwa currentStepId — chroni
        // przed double-advance gdy applyEffects dostaje dwa advanceStep efekty pod rząd.
        if (state.steps[state.currentStepId]?.status === 'done') break;
        const stepIds = Object.keys(state.steps);
        const currentIdx = stepIds.indexOf(state.currentStepId);
        const nextId = stepIds[currentIdx + 1] ?? null;
        set({
          currentStepId: nextId,
          steps: {
            ...state.steps,
            [state.currentStepId]: { status: 'done' },
          },
        });
        break;
      }
      case 'startSpinUpTimer': {
        // D-07/D-08: store odpala scheduleTimer (default setTimeout).
        // Pod vi.useFakeTimers() advanceTimersByTime przekręca zegar.
        const handle = scheduleTimer(() => get()._onSpinUpComplete(), effect.ms);
        set({ _spinUpTimerHandle: handle });
        break;
      }
      case 'playAudio':
        // Phase 5 implementuje. Phase 1 NO-OP.
        break;
      default:
        // Unknown effect — silently skip w Phase 1.
        break;
    }
  }
}

/** Live scoring counter — używa default weights (-25/-10/-2). */
function applyScoringEvent(scoring, severity) {
  const next = { ...scoring };
  if (severity === 'critical') next.criticalCount += 1;
  else if (severity === 'medium') next.mediumCount += 1;
  else if (severity === 'minor') next.minorCount += 1;
  next.score = Math.max(
    0,
    100 + next.criticalCount * -25 + next.mediumCount * -10 + next.minorCount * -2,
  );
  return next;
}
