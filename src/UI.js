// Phase 4 (Plan 04-06, D-Phase4-17): legacy projekcja isRunning → #status-text/#status-dot
// została USUNIĘTA. StatusPanel jest single source dla statusu maszyny (D-Phase4-03).
// Slider RPM tor (this.isRunning + getAngularVelocity()) zostaje — to ortogonalny kanał kontroli
// obrotu wału, niezależny od machineState w storze (D-Phase4-17).

export class UI {
  constructor() {
    this.elements = {
      // statusDot/statusText pozostają w DOM (Phase 4 nie usunął ich z index.html, control-panel je używa
      // jako legacy widget). StatusPanel renderuje #status-panel z własnymi sub-elementami.
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
    // ale NIE projektuje już do #status-text — StatusPanel jest single source.
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
}
