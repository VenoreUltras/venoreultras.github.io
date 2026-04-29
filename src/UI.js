export class UI {
  constructor() {
    this.elements = {
      statusDot: document.getElementById('status-dot'),
      statusText: document.getElementById('status-text'),
      speedSlider: document.getElementById('speed-slider'),
      speedValue: document.getElementById('speed-value'),
      btnToggle: document.getElementById('btn-toggle'),
      btnBuzzer: document.getElementById('btn-buzzer'),
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

    this.elements.btnBuzzer.addEventListener('click', () => {
      this.triggerBuzzer();
    });
  }

  updateStatus() {
    if (this.isRunning) {
      this.elements.statusDot.classList.remove('stopped');
      this.elements.statusDot.classList.add('running');
      this.elements.statusText.innerText = 'Praca ciągła';
    } else {
      this.elements.statusDot.classList.remove('running');
      this.elements.statusDot.classList.add('stopped');
      this.elements.statusText.innerText = 'Zatrzymana';
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

  /**
   * Placeholder dla komunikacji WebSerial wysyłającej sygnał do pinu D8
   */
  async triggerBuzzer() {
    console.log("[WebSerial] Próba wysłania sygnału do buzera (Pin D8)...");
    
    // Animacja przycisku jako feedback
    const originalText = this.elements.btnBuzzer.innerText;
    this.elements.btnBuzzer.innerText = "Wysyłanie...";
    this.elements.btnBuzzer.disabled = true;

    try {
      // W przyszłości tutaj znajdzie się kod WebSerial, np:
      // const port = await navigator.serial.requestPort();
      // await port.open({ baudRate: 9600 });
      // const writer = port.writable.getWriter();
      // await writer.write(new TextEncoder().encode("BUZZER_ON\n"));
      // writer.releaseLock();
      
      // Symulacja opóźnienia
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log("[WebSerial] Sygnał wysłany pomyślnie.");
    } catch (err) {
      console.error("[WebSerial] Błąd:", err);
    } finally {
      this.elements.btnBuzzer.innerText = originalText;
      this.elements.btnBuzzer.disabled = false;
    }
  }
}
