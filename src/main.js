// Style ładowane przez index.html (link rel=stylesheet href="/style.css") — root style.css jest jedynym source of truth (Phase Z hygiene).
import { gsap } from 'gsap';
import { SceneSetup } from './SceneSetup';
import { PressModel } from './PressModel';
import { UI } from './UI';
import { PhysicsEngine } from './PhysicsEngine';
import { createTrainingStore } from './state/trainingStore.js';
import { DisclaimerBanner } from './DisclaimerBanner';
import { RaycastController } from './RaycastController.js';
import { EmissiveController } from './highlight/EmissiveController.js';
import { HighlightManager } from './highlight/HighlightManager.js';
import { EdgeOutlineController } from './highlight/EdgeOutlineController.js';
import { StatusPanel } from './ui/StatusPanel.js';
import { StepPanel } from './ui/StepPanel.js';
import uruchomienie from './training/scenarios/uruchomienie.js';
import { TooltipManager } from './education/TooltipManager.js';
import { AudioController } from './education/AudioController.js';
import { KeyboardController } from './education/KeyboardController.js';
import { LabelOverlay } from './education/LabelOverlay.js';
import { HelpModal } from './ui/HelpModal.js';
import { ConfirmModal } from './ui/ConfirmModal.js';

const HC_STORAGE_KEY = 'pm300:hc-outline:v1'; // D-Phase4-09
const DIFFICULTY_KEY = 'pm300:difficulty:v1';  // D-Phase5-04
const AUDIO_MUTE_KEY = 'pm300:audio-mute:v1';  // D-Phase5-18

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
    this.store.setState({ difficulty: difficultyInitial, audioMuted: audioMutedInitial });

    // Persist warstwa — store-side toggleMute/setDifficulty zmienia state, Application
    // zapisuje do localStorage. trainingStore zachowuje boundary clean (D-Phase5-26).
    this._unsubscribers.push(
      this.store.subscribe((s) => s.difficulty, (v) => {
        try { localStorage.setItem(DIFFICULTY_KEY, v); } catch { /* silent */ }
      }),
      this.store.subscribe((s) => s.audioMuted, (v) => {
        try { localStorage.setItem(AUDIO_MUTE_KEY, String(v)); } catch { /* silent */ }
      }),
    );

    // D-Phase3-01: auto-start scenariusza uruchomienie (Phase 6 doda dropdown wyboru).
    this.store.getState().startScenario(uruchomienie);

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
    this.statusPanel = new StatusPanel({ store: this.store });
    this.stepPanel = new StepPanel({ store: this.store });

    // Phase 5 D-Phase5-25 — kolejność tworzenia:
    // (a) AudioController (boundary-clean, store-only — niezależny)
    this.audioController = new AudioController({ store: this.store });

    // (b) KeyboardController (window listener)
    this.keyboardController = new KeyboardController({
      store: this.store,
      scenarios: { uruchomienie },
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
    this.confirmModal = new ConfirmModal({
      store: this.store,
      scenarios: { uruchomienie },
    });

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

    // Dev-only: expose Application na window dla manualnego QA (D-Phase5-Discretion).
    if (import.meta.env?.DEV) {
      globalThis.__app__ = this;
    }
  }

  simulationTick(deltaTime) {
    // GSAP 3.x ticker: deltaTime w milisekundach (kontrakt zablokowany ~3.15.0 pin w package.json — INFRA-03).
    const dtSeconds = deltaTime / 1000;
    const state = this.store.getState();
    const { machineState, activeModal } = state;

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

    if (!integrationPaused && this._omega > 0) {
      this.currentAngle = (this.currentAngle + this._omega * dtSeconds) % (Math.PI * 2);
    }

    // Aktualizujemy pozycję elementów modelu prasy
    this.pressModel.update(this.currentAngle);

    // Wyliczamy przesunięcie do wyświetlenia w UI
    const displacement = PhysicsEngine.calculateSliderPosition(
      this.currentAngle, this.pressModel.r, this.pressModel.l,
    );

    // Aktualizujemy dane w UI
    this.ui.updateTelemetry(this.currentAngle, displacement);

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
    if (this.disclaimerBanner) this.disclaimerBanner.dispose();
    // Phase 4
    if (this.stepPanel) this.stepPanel.dispose();
    if (this.statusPanel) this.statusPanel.dispose();
    // Phase 5 — odwrotna kolejność tworzenia
    if (this.tooltipManager) this.tooltipManager.dispose();
    if (this.confirmModal) this.confirmModal.dispose();
    if (this.helpModal) this.helpModal.dispose();
    if (this.labelOverlay) this.labelOverlay.dispose();              // PRZED sceneSetup.dispose (CSS2DRenderer order)
    if (this.keyboardController) this.keyboardController.dispose();
    if (this.audioController) this.audioController.dispose();        // PRZED emissive (logiczna kolejność)
    // Phase 4 cd.
    if (this.highlightManager) this.highlightManager.dispose();
    if (this.edgeOutlineController) this.edgeOutlineController.dispose();
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
