// Phase 4 (Plan 04-06, D-Phase4-17): legacy projekcja isRunning → #status-text/#status-dot
// została USUNIĘTA. StatusPanel jest single source dla statusu maszyny (D-Phase4-03).
// Slider RPM tor (this.isRunning + getAngularVelocity()) zostaje — to ortogonalny kanał kontroli
// obrotu wału, niezależny od machineState w storze (D-Phase4-17).
//
// Phase 11 FUNC-11-04 (Plan 11-02): re-bind #status-text/#status-dot jako ortogonalny kanał
// ω-driven hardware state. StatusPanel pozostaje single source dla SOP machineState
// (D-Phase4-03 invariant zachowany — to DWA różne widgety, DWA różne sygnały):
//   - StatusPanel → SOP machineState (gotowa-do-pracy, w-cyklu, awaria, ...)
//   - #status-text → hardware state (Aktywny / Nieaktywny / Bezczynny idle) z (isRunning, _omega).

import { pl } from './i18n/pl.js';

// FUNC-11-04 threshold: ω ≤ 0.01 rad/s traktujemy jako idle (~0.1 RPM efektywne).
// Granica inclusive — przy dokladnie 0.01 → idle (test 4 wymusza).
const IDLE_OMEGA_THRESHOLD = 0.01;

export class UI {
  constructor() {
    this.elements = {
      // statusDot/statusText pozostają w DOM (Phase 4 nie usunął ich z index.html, control-panel je używa
      // jako legacy widget). StatusPanel renderuje #status-panel z własnymi sub-elementami.
      // Phase 11 FUNC-11-04: re-aktywowane jako ω-driven hardware state indicator (ortogonalny kanał).
      statusDot: document.getElementById('status-dot'),
      statusText: document.getElementById('status-text'),
      speedSlider: document.getElementById('speed-slider'),
      speedValue: document.getElementById('speed-value'),
      btnToggle: document.getElementById('btn-toggle'),
      valAngle: document.getElementById('val-angle'),
      valDisplacement: document.getElementById('val-displacement')
    };

    // Stan UI — slider RPM tor (D-Phase4-17 zachowany)
    this.isRunning = false;
    this.speed = parseInt(this.elements.speedSlider.value, 10);

    this.bindEvents();
  }

  bindEvents() {
    // D-Phase4-17: btn-toggle nadal flipuje this.isRunning (slider RPM tor),
    // ale NIE projektuje już do #status-text — StatusPanel jest single source dla SOP.
    // Phase 11 FUNC-11-04: per-tick projekcja przez updateStatus() — nie tu (event-driven byłby
    // niespójny z _omega ramp w simulationTick).
    this.elements.btnToggle.addEventListener('click', () => {
      this.isRunning = !this.isRunning;
    });

    this.elements.speedSlider.addEventListener('input', (e) => {
      this.speed = parseInt(e.target.value, 10);
      this.elements.speedValue.innerText = this.speed;
    });
  }

  /**
   * Zwraca prędkość obrotową w radianach na sekundę
   */
  getAngularVelocity() {
    // rpm (obroty na minutę) -> obr/sekunda -> rad/sekunda
    // 1 obrót = 2*PI radianów
    return this.isRunning ? (this.speed / 60) * Math.PI * 2 : 0;
  }

  /**
   * Aktualizuje wyświetlane parametry na panelu informacyjnym
   * @param {number} angleRad - Kąt w radianach
   * @param {number} displacement - Wyliczone y suwaka
   */
  updateTelemetry(angleRad, displacement) {
    // Normalizacja kąta do 0-360 stopni
    let deg = (angleRad * 180 / Math.PI) % 360;
    if (deg < 0) deg += 360;

    this.elements.valAngle.innerText = `${deg.toFixed(1)}°`;
    this.elements.valDisplacement.innerText = `${displacement.toFixed(3)} m`;
  }

  /**
   * Phase 11 FUNC-11-04: projekcja (isRunning, omega) → #status-text + #status-dot CSS class.
   * Wywoływane per-tick z Application.simulationTick. 3 stany:
   *   - !isRunning              → 'Nieaktywny'       + dot.stopped
   *   - isRunning && ω > 0.01   → 'Aktywny'          + dot.running
   *   - isRunning && ω ≤ 0.01   → 'Bezczynny (idle)' + dot.idle
   * Stop ma priorytet nad omega (operator zatrzymał — sygnalizujemy Stop bez względu na ramp-down).
   * @param {boolean} isRunning
   * @param {number} omega - bieżąca prędkość kątowa w rad/s
   */
  updateStatus(isRunning, omega) {
    let text, dotState;
    if (!isRunning) {
      text = pl.ui.statusInactive;
      dotState = 'stopped';
    } else if (omega > IDLE_OMEGA_THRESHOLD) {
      text = pl.ui.statusActive;
      dotState = 'running';
    } else {
      text = pl.ui.statusIdle;
      dotState = 'idle';
    }
    this.elements.statusText.textContent = text;
    this.elements.statusDot.className = `dot ${dotState}`;
  }
}
