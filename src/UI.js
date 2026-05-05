import { pl } from './i18n/pl.js';

export class UI {
  constructor() {
    this.elements = {
      statusDot: document.getElementById('status-dot'),
      statusText: document.getElementById('status-text'),
      speedSlider: document.getElementById('speed-slider'),
      speedValue: document.getElementById('speed-value'),
      btnToggle: document.getElementById('btn-toggle'),
      valAngle: document.getElementById('val-angle'),
      valDisplacement: document.getElementById('val-displacement')
    };

    // Stan UI
    this.isRunning = false;
    this.speed = parseInt(this.elements.speedSlider.value, 10);

    this.bindEvents();
  }

  bindEvents() {
    this.elements.btnToggle.addEventListener('click', () => {
      this.isRunning = !this.isRunning;
      this.updateStatus();
    });

    this.elements.speedSlider.addEventListener('input', (e) => {
      this.speed = parseInt(e.target.value, 10);
      this.elements.speedValue.innerText = this.speed;
    });
  }

  updateStatus() {
    if (this.isRunning) {
      this.elements.statusDot.classList.remove('stopped');
      this.elements.statusDot.classList.add('running');
      this.elements.statusText.innerText = pl.ui.statusRunning;
    } else {
      this.elements.statusDot.classList.remove('running');
      this.elements.statusDot.classList.add('stopped');
      this.elements.statusText.innerText = pl.ui.statusStopped;
    }
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
