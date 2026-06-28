// Style ładowane przez index.html (link rel=stylesheet href="/style.css") — root style.css jest jedynym source of truth (Phase Z hygiene).
import { gsap } from 'gsap';
import { SceneSetup } from './SceneSetup';
import { PressModel } from './PressModel';
import { UI } from './UI';
import { PhysicsEngine } from './PhysicsEngine';
import { createTrainingStore } from './state/trainingStore.js';
import { DisclaimerBanner } from './DisclaimerBanner';
// Phase 10 D-10-06: klik-driven manipulation animator (oslona-przednia + dzwignia-sprzegla; architektura otwarta dla wylacznik-glowny).
import { InteractionAnimator } from './interaction/InteractionAnimator.js';
import { RaycastController } from './RaycastController.js';
import { EmissiveController } from './highlight/EmissiveController.js';
import { HighlightManager } from './highlight/HighlightManager.js';
import { EdgeOutlineController } from './highlight/EdgeOutlineController.js';
import { StatusPanel } from './ui/StatusPanel.js';
import { StepPanel } from './ui/StepPanel.js';
import uruchomienie from './training/scenarios/uruchomienie.js';
import { scenarios as allScenarios } from './training/scenarios/index.js';
import { TooltipManager } from './education/TooltipManager.js';
import { AudioController } from './education/AudioController.js';
import { KeyboardController } from './education/KeyboardController.js';
import { LabelOverlay } from './education/LabelOverlay.js';
import { HelpModal } from './ui/HelpModal.js';
import { ConfirmModal } from './ui/ConfirmModal.js';
import { ElementInfoOverlay } from './ui/ElementInfoOverlay.js';
import { ExamPromptModal } from './ui/ExamPromptModal.js';
// Phase 17 Plan 17-02 (EXAM-04): QuizController — modal końcowego quizu BHP.
import { QuizController } from './ui/QuizController.js';
// Phase 15 Plan 15-02 (MENU-01/02/03): ekran startowy wyboru trybu.
import { StartMenuOverlay } from './ui/StartMenuOverlay.js';
// Phase 11 Plan 11-05 (FUNC-11-09..12): ElevenLabs TTS Lektor.
import { LectorService } from './lector/LectorService.js';
// Phase 16 Plan 16-01/02 (MED-03): MediaManager — resolveSrc DI dla overlay mediów.
import { MediaManager } from './media/MediaManager.js';
import { LECTOR_VOICES, DEFAULT_LECTOR_VOICE_ID } from './data/lectorVoices.js';
// Phase 6 Plan 06-08 — replay + session overlay + persistence + export wrappers.
import { ReplayEngine } from './replay/ReplayEngine.js';
import { ReplayDrawer } from './ui/ReplayDrawer.js';
import { SessionOverlay } from './ui/SessionOverlay.js';
import { computeMetrics } from './training/ScoringService.js';
import {
  loadPersistedSession,
  savePersistedSession,
  SESSION_KEY,
} from './persistence/sessionPersistence.js';
import { pl } from './i18n/pl.js';

const HC_STORAGE_KEY = 'pm300:hc-outline:v1'; // D-Phase4-09
const DIFFICULTY_KEY = 'pm300:difficulty:v1';  // D-Phase5-04
const AUDIO_MUTE_KEY = 'pm300:audio-mute:v1';  // D-Phase5-18
const MODE_KEY = 'pm300:mode:v1';              // Phase 11 Plan 11-01 (FUNC-11-01)
const LECTOR_ENABLED_KEY = 'pm300:lector:enabled'; // Phase 11 Plan 11-05 (FUNC-11-12)
const LECTOR_VOICE_KEY   = 'pm300:lector:voice';   // Phase 11 Plan 11-05 (FUNC-11-12)
const START_MENU_SHOWN_KEY = 'pm300:start-menu-shown:v1'; // Phase 15 MENU-01 (first-launch flag)

export class Application {
  constructor() {
    this.sceneSetup = new SceneSetup('three-canvas');
    this.pressModel = new PressModel(this.sceneSetup.scene);
    this.ui = new UI();
    this.disclaimerBanner = new DisclaimerBanner();  // UI-05 (Plan 05)
    this.store = createTrainingStore();
    this.currentAngle = 0; // Kąt w radianach
    this._omega = 0; // Bieżąca prędkość kątowa wału [rad/s] — lerp w simulationTick

    // Tickable list (RESEARCH §"Pattern 3" — Phase 3 dorzuca raycastHover bez merge-conflict).
    this.tickables = [(dt) => this.simulationTick(dt)];
    this._tickerCallback = (time, dt) => {
      for (const fn of this.tickables) fn(dt);
      this.sceneSetup.render();
    };

    // Zamiast requestAnimationFrame używamy GSAP ticker (single source of timing).
    gsap.ticker.add(this._tickerCallback);

    // STATE-03 (T-04-01): capture każde unsubscribe handle, zwalniane w dispose().
    this._unsubscribers = [];

    // D-Phase4-09: bootstrap hcOutlineMode z localStorage PRZED konstruktorami subskryberów.
    // EdgeOutlineController/StatusPanel czytają już ustawioną wartość w swoim ctor.
    // Silent catch dla private mode/quota — graceful degradacja do false (T-04-13).
    const hcInitial = (() => {
      try { return localStorage.getItem(HC_STORAGE_KEY) === 'true'; }
      catch { return false; }
    })();
    this.store.setState({ hcOutlineMode: hcInitial });

    // D-Phase5-04 + D-Phase5-18 bootstrap. Graceful catch (analog hcInitial pattern T-04-13).
    const difficultyInitial = (() => {
      try {
        const v = localStorage.getItem(DIFFICULTY_KEY);
        return (v === 'nauka' || v === 'egzamin') ? v : 'nauka';
      } catch { return 'nauka'; }
    })();
    const audioMutedInitial = (() => {
      try { return localStorage.getItem(AUDIO_MUTE_KEY) === 'true'; }
      catch { return false; }
    })();
    // Phase 11 Plan 11-01 (FUNC-11-01): cold start canonical mode.
    // 'egzamin' value w localStorage fallback do 'free' — nie chcemy startować z zablokowanym
    // togglerem (egzamin lock w setMode wymaga aktywnej sesji, ale UX-wise świeży reload
    // powinien dać user'owi czysty start, nie wymuszać kontynuacji egzaminu).
    const modeInitial = (() => {
      try {
        const v = localStorage.getItem(MODE_KEY);
        return (v === 'free' || v === 'nauka') ? v : 'free';
      } catch { return 'free'; }
    })();
    // Phase 11 Plan 11-05 (FUNC-11-12): bootstrap lector state z localStorage.
    // Valid-value guard dla voiceId — fallback do DEFAULT gdy ID nie w LECTOR_VOICES (np. usunięty głos).
    const lectorEnabledInitial = (() => {
      try { return localStorage.getItem(LECTOR_ENABLED_KEY) === 'true'; }
      catch { return false; }
    })();
    const lectorVoiceIdInitial = (() => {
      try {
        const v = localStorage.getItem(LECTOR_VOICE_KEY);
        const valid = LECTOR_VOICES.some(voice => voice.id === v);
        return valid ? v : DEFAULT_LECTOR_VOICE_ID;
      } catch { return DEFAULT_LECTOR_VOICE_ID; }
    })();
    this.store.setState({
      difficulty: difficultyInitial,
      // Phase 11 FIX: mode jest canonical SSOT — bootstrap MUSI rzutować alias freeRoam
      // tak jak robi setMode (free → freeRoam=true). Bez tego cold-start 'free' zostawał
      // z freeRoam=false (default store'a), więc HighlightManager traktował scenę jak 'nauka'
      // (podświetlał kroki SOP) a wskaźnik "tryb swobodny" był ukryty — tryb swobodny
      // efektywnie "nie startował" mimo mode==='free'.
      freeRoam: modeInitial === 'free',
      audioMuted: audioMutedInitial,
      mode: modeInitial,
      lectorEnabled: lectorEnabledInitial,
      lectorVoiceId: lectorVoiceIdInitial,
    });

    // Phase 15 MENU-01: first-launch detection. Brak klucza → pokaż menu; 'true' → pomiń.
    // HARD CONSTRAINT (Pitfall 1): setState({ showStartMenu }) MUSI poprzedzać konstruktor overlayu
    // (i innych subscriberów). Silent catch — private mode/quota → false (T-15-04).
    const startMenuShownInitial = (() => {
      try { return localStorage.getItem(START_MENU_SHOWN_KEY) === 'true'; }
      catch { return false; }
    })();
    if (!startMenuShownInitial) {
      this.store.setState({ showStartMenu: true });
    }

    // Persist warstwa — store-side toggleMute/setDifficulty zmienia state, Application
    // zapisuje do localStorage. trainingStore zachowuje boundary clean (D-Phase5-26).
    this._unsubscribers.push(
      this.store.subscribe((s) => s.difficulty, (v) => {
        try { localStorage.setItem(DIFFICULTY_KEY, v); } catch { /* silent */ }
      }),
      this.store.subscribe((s) => s.audioMuted, (v) => {
        try { localStorage.setItem(AUDIO_MUTE_KEY, String(v)); } catch { /* silent */ }
      }),
      // Phase 11 Plan 11-01: persist mode (analog difficulty subscriber, T-04-13 graceful catch).
      this.store.subscribe((s) => s.mode, (v) => {
        try { localStorage.setItem(MODE_KEY, v); } catch { /* silent */ }
      }),
      // Phase 11 Plan 11-05 (FUNC-11-12): persist lector on/off + voice picker.
      this.store.subscribe((s) => s.lectorEnabled, (v) => {
        try { localStorage.setItem(LECTOR_ENABLED_KEY, String(v)); } catch { /* silent */ }
      }),
      this.store.subscribe((s) => s.lectorVoiceId, (v) => {
        try { localStorage.setItem(LECTOR_VOICE_KEY, v); } catch { /* silent */ }
      }),
    );

    // Phase 6 Plan 06-08 — bootstrap persisted session (ostatnia sesja, exposable via SessionOverlay
    // history button). NIE wpływa na initial state — startScenario poniżej resetuje stan.
    this._persistedSession = loadPersistedSession(SESSION_KEY);

    // D-Phase3-01: auto-start scenariusza uruchomienie (Phase 6 dorzuca ScenarioSelector + klawisze 1-4).
    this.store.getState().startScenario(uruchomienie);

    // Phase 6 Plan 06-08 — machineStateAttest initial-state edge case (Plan 06-02 Task 2).
    // Subscriber widzi tylko zmiany; gdy pierwszy step już matchuje initialMachineState — attempt ręcznie.
    {
      const initialState = this.store.getState();
      const initialStep = initialState.activeScenario?.steps?.find(s => s.id === initialState.currentStepId);
      if (initialStep?.kind === 'machineStateAttest') {
        initialState.attemptMachineStateAttest?.();
      }
    }

    // Phase 6 Plan 06-08 — diagnostic mesh sanity check (T-06-07 mitigation).
    // Po każdym starcie scenariusza weryfikuje że wszystkie targetMeshIds istnieją w pressModel.
    this._unsubscribers.push(this.store.subscribe(
      (s) => s.session?.scenarioId,
      (scenarioId) => {
        if (!scenarioId || !allScenarios[scenarioId]) return;
        const interactableIds = new Set(this.pressModel.getInteractables().keys());
        for (const step of allScenarios[scenarioId].steps ?? []) {
          const meshIds = step.targetMeshIds ?? (step.targetMeshId ? [step.targetMeshId] : []);
          for (const m of meshIds) {
            if (!interactableIds.has(m)) {
              console.warn(`[Application] Scenariusz ${scenarioId}: mesh "${m}" w kroku "${step.id}" nie istnieje w pressModel.`);
            }
          }
        }
      },
      { fireImmediately: true },
    ));

    // Phase 6 Plan 06-08 — cycle-end timer (T-06-21 mitigation: clearTimeout na każdą zmianę
    // machineState !== 'w-cyklu', defensive check przed setMachineState='cykl-zakonczony').
    this._cycleEndHandle = null;
    this._unsubscribers.push(this.store.subscribe(
      (s) => s.machineState,
      (cur, prev) => {
        if (cur === 'w-cyklu' && prev !== 'w-cyklu') {
          clearTimeout(this._cycleEndHandle);
          this._cycleEndHandle = setTimeout(() => {
            if (this.store.getState().machineState === 'w-cyklu') {
              this.store.setState({ machineState: 'cykl-zakonczony' });
            }
          }, 3000); // 3s cycle duration (matches Phase 1 spin-up timer)
        }
        if (cur !== 'w-cyklu') {
          clearTimeout(this._cycleEndHandle);
          this._cycleEndHandle = null;
        }
      },
    ));

    // Phase 6 Plan 06-08 — persist subscriber: na finishedAt !== null zapisz snapshot do localStorage.
    this._unsubscribers.push(this.store.subscribe(
      (s) => s.session.finishedAt,
      (finishedAt) => {
        if (finishedAt === null) return;
        const state = this.store.getState();
        const snapshot = {
          version: 'v1',
          session: state.session,
          metadata: {
            exportedAt: Date.now(),
            appVersion: 'pm300-trener v1.0',
            scenarioTitlePL: pl.scenarios[state.session.scenarioId]?.title,
          },
        };
        savePersistedSession(snapshot, SESSION_KEY);
      },
    ));

    // Phase 15 MENU-02: drugi, niezależny subscriber finishedAt — zapis wskaźnika ostatniej sesji
    // pm300:last-session:<mode>:v1 = JSON { score, date }. ORTHOGONALNY do pm300:session:v1 powyżej.
    // Phase 17 NIE MOŻE zastąpić tego subscribera (osobna ścieżka per-mode dla kart start menu).
    // Silent catch — quota / private mode (T-15-05).
    this._unsubscribers.push(this.store.subscribe(
      (s) => s.session.finishedAt,
      (finishedAt) => {
        if (finishedAt === null) return;
        const state = this.store.getState();
        const mode = state.mode; // 'free' | 'nauka' | 'egzamin'
        const key = `pm300:last-session:${mode}:v1`;
        // WR-03: data w czasie LOKALNYM (toISOString jest w UTC → off-by-one
        // dla użytkowników poza UTC blisko północy).
        const d = new Date(finishedAt);
        const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; // 'YYYY-MM-DD'
        try {
          localStorage.setItem(key, JSON.stringify({ score: state.scoring.score, date }));
        } catch { /* quota / private mode — silent */ }
      },
    ));

    // D-Phase4-14: EmissiveController PRZED RaycastController (RaycastController potrzebuje go w DI dla warstwy 'hover').
    this.emissiveController = new EmissiveController({
      interactables: this.pressModel.getInteractables(),
    });

    // INTERACT-01..05: RaycastController jako DI z pressModel.getInteractables() (Phase 2 contract).
    // D-Phase4-13: hover read-modify-restore zastąpione przez EmissiveController.setLayer/clearLayer.
    this.raycastController = new RaycastController({
      renderer: this.sceneSetup.renderer,
      camera: this.sceneSetup.camera,
      interactables: this.pressModel.getInteractables(),
      store: this.store,
      emissive: this.emissiveController,
    });
    this.tickables.push((dt) => this.raycastController._runHysteresis(dt));

    // Phase 10 D-10-09: RaycastController emituje (id, mesh) dla mesh z userData.poses; animator filtruje per
    // `userData.poses` i tweenuje pivot.rotation. Brak coupling do trainingStore (D-10-07).
    this.interactionAnimator = new InteractionAnimator({ interactables: this.pressModel.getInteractables() });
    // Po-hoc callback assign: analog _onHoverChange / TooltipManager (Plan 03 D-10-09).
    this.raycastController._onManipulationClick = (id, mesh) => { this.interactionAnimator.handleClick(id, mesh); };

    // D-Phase4-15: HighlightManager subskrybuje state.steps → emissive layer 'state' (error pulse / done flash).
    this.highlightManager = new HighlightManager({
      store: this.store,
      emissive: this.emissiveController,
      interactables: this.pressModel.getInteractables(),
    });

    // FEEDBACK-05 (D-Phase4-10): EdgeOutlineController prebuilduje LineSegments + subskrybuje hcOutlineMode.
    this.edgeOutlineController = new EdgeOutlineController({
      interactables: this.pressModel.getInteractables(),
      store: this.store,
    });

    // UI-01/02 (D-Phase4-03/04): DOM panele top bar + lewa kolumna.
    // Zastępują Phase 3 placeholdery (#phase3-step-readout/#phase3-attest-container) i projekcję
    // isRunning → #status-text z UI.updateStatus() (D-Phase4-02/D-Phase4-17).
    // Phase 11 Plan 11-05 (FUNC-11-09..12): instantiate LectorService PRZED StatusPanel + ElementInfoOverlay,
    // by oba mogły dostać go w DI. LectorService czyta VITE_ELEVENLABS_API_KEY domyślnie;
    // graceful gdy brak klucza (isAvailable===false → UI fallback disabled+tooltip).
    this.lectorService = new LectorService({ store: this.store });

    // Phase 16 Plan 16-02 (MED-03): MediaManager (stateless, brak store DI) — wstrzykiwany
    // do ElementInfoOverlay dla resolveSrc mediów. Tworzony PRZED overlay.
    this.mediaManager = new MediaManager();

    this.statusPanel = new StatusPanel({
      store: this.store,
      lectorService: this.lectorService,
      lectorVoices: LECTOR_VOICES,
    });
    this.stepPanel = new StepPanel({ store: this.store });

    // Phase 5 D-Phase5-25 — kolejność tworzenia:
    // (a) AudioController (boundary-clean, store-only — niezależny)
    this.audioController = new AudioController({ store: this.store });

    // (b) KeyboardController (window listener) — Phase 6 Plan 06-08: wszystkie 4 scenariusze.
    this.keyboardController = new KeyboardController({
      store: this.store,
      scenarios: allScenarios,
    });

    // (c) LabelOverlay (per-frame tickable)
    this.labelOverlay = new LabelOverlay({
      scene: this.sceneSetup.scene,
      camera: this.sceneSetup.camera,
      renderer: this.sceneSetup.renderer,
      interactables: this.pressModel.getInteractables(),
      store: this.store,
    });
    this.tickables.push(() => this.labelOverlay.update());  // FEEDBACK-06 per-frame

    // (d) HelpModal (DOM modal blocker)
    this.helpModal = new HelpModal({ store: this.store });

    // (d.2) ConfirmModal — modal dla potwierdzenia zmiany scenariusza mid-run (D-Phase5-07).
    // Phase 6 Plan 06-08: wszystkie 4 scenariusze dostępne dla mid-run switch.
    this.confirmModal = new ConfirmModal({
      store: this.store,
      scenarios: allScenarios,
    });

    // (d.3) ElementInfoOverlay — Phase 14 Plan 14-01/02 (OVL-01): edukacyjny overlay
    // dla 15 interactables. Renderuje conditional content per store.mode (free=opis, nauka=4 sekcje).
    // RaycastController wywołuje store.openElementInfo w mode='free'/'nauka' branch.
    this.elementInfoOverlay = new ElementInfoOverlay({
      store: this.store,
      lectorService: this.lectorService,
      mediaManager: this.mediaManager,
    });

    // (d.4) ExamPromptModal — Phase 11 Plan 11-04 (FUNC-11-05/06): auto-prompt po SOP done w nauce.
    // Store subscriber (trainingStore Plan 11-04) ustawia activeModal='exam-prompt';
    // user wybiera Tak (setMode egzamin + restart) / Nie (endExam → free).
    this.examPromptModal = new ExamPromptModal({
      store: this.store,
      scenarios: allScenarios,
    });

    // (d.5) QuizController — Phase 17: modal quizu BHP, wyzwalany przez
    // activeModal='bhp-quiz' ustawiany przez subscriber finishedAt w trybie egzamin.
    // Konstruowany PO examPromptModal → disposowany PRZED nim (odwrotna kolejność).
    this.quizController = new QuizController({ store: this.store });

    // (e) TooltipManager — PO RaycastController, by wpiąć onHoverChange callback po-hoc
    this.tooltipManager = new TooltipManager({
      store: this.store,
      raycastController: this.raycastController,
    });
    // Po-hoc assign onHoverChange (TooltipManager wymaga raycastController instancji, circular dep w ctor)
    this.raycastController._onHoverChange = (id, mesh) => {
      if (id) this.tooltipManager.onHoverEnter(id, this.sceneSetup.renderer.domElement);
      else this.tooltipManager.onHoverLeave();
      // LabelOverlay tryb hover-only — śledzi bieżący hovered mesh.
      this.labelOverlay.onHoverChange(id, mesh);
    };

    // Phase 6 Plan 06-08 wiring — ReplayEngine + ReplayDrawer + SessionOverlay z DI export wrapperów.
    // Kolejność: ReplayEngine (gsap.ticker, attach) → ReplayDrawer (DI replayEngine) → SessionOverlay.
    this.replayEngine = new ReplayEngine({ liveStore: this.store, gsapTicker: gsap.ticker });
    this.replayEngine.attach();
    this.replayDrawer = new ReplayDrawer({ store: this.store, replayEngine: this.replayEngine });
    this.sessionOverlay = new SessionOverlay({
      store: this.store,
      scenarios: allScenarios,
      computeMetrics,
    });

    // Phase 15 (MENU-01/03): StartMenuOverlay — ekran startowy wyboru trybu.
    // Bootstrap showStartMenu (powyżej) JUŻ wykonany → ctor odczyta poprawną widoczność (Pitfall 1).
    this.startMenuOverlay = new StartMenuOverlay({ store: this.store });

    // Dev-only: expose Application na window dla manualnego QA (D-Phase5-Discretion).
    if (import.meta.env?.DEV) {
      globalThis.__app__ = this;
    }
  }

  simulationTick(deltaTime) {
    // GSAP 3.x ticker: deltaTime w milisekundach (kontrakt zablokowany ~3.15.0 pin w package.json — INFRA-03).
    const dtSeconds = deltaTime / 1000;
    const state = this.store.getState();
    const { machineState, activeModal, replayOpen } = state;

    // Phase 6 — podczas replay: czytaj angle Z store (ReplayEngine.scrubTo go ustawia),
    // pomiń integration, ale dalej renderuj scene + telemetry dla wizualnego feedbacku.
    if (replayOpen) {
      const replayAngle = state._currentAngle ?? 0;
      this.currentAngle = replayAngle;
      this.pressModel.update(replayAngle);
      // Wychylenie liczone jako inwariant kinematyczny (prezentacja telemetrii usunięta w Fazie 18).
      const displacement = PhysicsEngine.calculateSliderPosition(
        replayAngle, this.pressModel.r, this.pressModel.l,
      );
      void displacement; // inwariant kinematyczny — obliczenie zachowane, prezentacja usunięta
      return;
    }

    // D-Phase5-23 + D-Phase5-28: pauza integration gdy modal otwarty.
    // Rendering + raycaster + label overlay nadal działają (poza tym predicatem).
    const integrationPaused = activeModal !== null;

    // Prędkość kątowa wyprowadzona z machineState (SOP-aware spin-up). Slider RPM ustawia target.
    // Manual override: gdy operator naciśnie Start/Stop, slider tor sumuje się gdy machineState idle.
    const targetRpm = this.ui.speed;
    const targetOmega = (targetRpm / 60) * Math.PI * 2;
    const spinActive = machineState === 'rozpedzanie'
      || machineState === 'gotowa-do-pracy'
      || machineState === 'w-cyklu';
    // Manual fallback: gdy SOP nie aktywuje napędu, slider+Start nadal działa (legacy demo tor).
    const desiredOmega = spinActive ? targetOmega : this.ui.getAngularVelocity();
    // Ramp: pełne nabranie obrotów w 3s (matchuje store startSpinUpTimer 3000ms).
    const rampRate = targetOmega / 3.0;
    const maxStep = rampRate * dtSeconds;
    const delta = desiredOmega - this._omega;
    this._omega += Math.sign(delta) * Math.min(Math.abs(delta), maxStep);

    // Phase 11 FUNC-11-04 — ω-driven status indicator (orthogonal channel od StatusPanel SOP machineState).
    // Projekcja (ui.isRunning, _omega) → #status-text/#status-dot per tick. W replay (early-return powyzej)
    // wywolanie pomijamy — status zamarza na ostatnim live frame (acceptable: replay to historic data).
    this.ui.updateStatus(this.ui.isRunning, this._omega);

    if (!integrationPaused && this._omega > 0) {
      this.currentAngle = (this.currentAngle + this._omega * dtSeconds) % (Math.PI * 2);
    }

    // Phase 6 Plan 06-08 Pitfall 1 — events potrzebują angle do deterministic replay 3D pose.
    // _currentAngle to pole "private" (underscore prefix); brak selektywnych subscriberów → T-06-22 OK.
    state.setCurrentAngle?.(this.currentAngle);

    // Aktualizujemy pozycję elementów modelu prasy
    this.pressModel.update(this.currentAngle);

    // Wychylenie liczone jako inwariant kinematyczny (prezentacja telemetrii usunięta w Fazie 18).
    const displacement = PhysicsEngine.calculateSliderPosition(
      this.currentAngle, this.pressModel.r, this.pressModel.l,
    );
    void displacement; // inwariant kinematyczny — obliczenie zachowane, prezentacja usunięta

    // D-Phase5-17: AudioController hum freq/gain proporcjonalny do effective RPM.
    const rpmEffective = (this._omega / (Math.PI * 2)) * 60;
    this.audioController?.updateHum(rpmEffective);
  }

  /**
   * Zwalnia wszystkie subskrypcje + GSAP ticker callback + komponenty (STATE-03).
   * Wywoływane przez Vite HMR `import.meta.hot.dispose()` aby uniknąć leaków
   * subscriberów (T-04-01) i resize listenerów (T-04-02) między hot reloadami.
   *
   * KOLEJNOŚĆ DISPOSE (T-04-14): RaycastController PRZED emissiveController.
   * RaycastController.dispose() woła _commitLeave() → emissive.clearLayer('hover', target),
   * więc EmissiveController musi jeszcze żyć w tym momencie. EmissiveController na końcu
   * killuje wszystkie GSAP timelines i restoruje baseline.
   */
  dispose() {
    gsap.ticker.remove(this._tickerCallback);
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    // Phase 6 Plan 06-08 — cycle-end timer cleanup PRZED komponentami (defensive).
    if (this._cycleEndHandle) {
      clearTimeout(this._cycleEndHandle);
      this._cycleEndHandle = null;
    }
    // Phase 15 — odwrotna kolejność tworzenia: StartMenuOverlay disposed jako jeden z pierwszych UI.
    if (this.startMenuOverlay) this.startMenuOverlay.dispose();
    // Phase 6 — odwrotna kolejność tworzenia: SessionOverlay → ReplayDrawer → ReplayEngine.
    if (this.sessionOverlay) this.sessionOverlay.dispose();
    if (this.replayDrawer) this.replayDrawer.dispose();
    if (this.replayEngine) this.replayEngine.dispose();
    if (this.disclaimerBanner) this.disclaimerBanner.dispose();
    // Phase 4
    if (this.stepPanel) this.stepPanel.dispose();
    if (this.statusPanel) this.statusPanel.dispose();
    // Phase 5 — odwrotna kolejność tworzenia
    if (this.tooltipManager) this.tooltipManager.dispose();
    // Phase 17 — odwrotna kolejność tworzenia: quizController PRZED examPromptModal.
    if (this.quizController) this.quizController.dispose();
    if (this.examPromptModal) this.examPromptModal.dispose();
    if (this.elementInfoOverlay) this.elementInfoOverlay.dispose();
    // Phase 16 Plan 16-02 — odwrotna kolejność tworzenia (po overlay, przed lectorService). No-op dispose.
    if (this.mediaManager) this.mediaManager.dispose?.();
    if (this.confirmModal) this.confirmModal.dispose();
    if (this.helpModal) this.helpModal.dispose();
    if (this.labelOverlay) this.labelOverlay.dispose();              // PRZED sceneSetup.dispose (CSS2DRenderer order)
    if (this.keyboardController) this.keyboardController.dispose();
    if (this.lectorService) this.lectorService.dispose();            // Phase 11 Plan 11-05 — revokeObjectURL cache
    if (this.audioController) this.audioController.dispose();        // PRZED emissive (logiczna kolejność)
    // Phase 4 cd.
    if (this.highlightManager) this.highlightManager.dispose();
    if (this.edgeOutlineController) this.edgeOutlineController.dispose();
    // Phase 10 — animator dispose PRZED raycast: zatrzymuje GSAP timelines piszące do pivot.rotation, czyści Mapy.
    // Raycast `_onManipulationClick` callback ref clearuje się w cleanup zewnętrznym (GC),
    // ale animator dispose zapobiega ghost tween po HMR (T-10-08 mitigation).
    if (this.interactionAnimator) this.interactionAnimator.dispose();
    if (this.raycastController) this.raycastController.dispose();    // PRZED emissive — _commitLeave woła clearLayer (T-04-14)
    if (this.emissiveController) this.emissiveController.dispose();
    this.pressModel.disposeMaterials();  // TWIN-11 SC5 — release GPU buffers (materials + textures) na HMR
    this.sceneSetup.dispose();
  }
}

// Bootstrap
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new Application();
});

// Vite HMR — STATE-03: na hot reload zwalniamy stary Application zanim Vite załaduje nowy.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (app) app.dispose();
  });
}
