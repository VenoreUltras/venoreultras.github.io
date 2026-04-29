import './style.css'; // Vite załaduje ten plik
import { gsap } from 'gsap';
import { SceneSetup } from './SceneSetup';
import { PressModel } from './PressModel';
import { UI } from './UI';
import { PhysicsEngine } from './PhysicsEngine';

class Application {
  constructor() {
    this.sceneSetup = new SceneSetup('three-canvas');
    this.pressModel = new PressModel(this.sceneSetup.scene);
    this.ui = new UI();

    this.currentAngle = 0; // Kąt w radianach

    // Zamiast requestAnimationFrame używamy GSAP ticker do zapewnienia
    // bardzo płynnej i spójnej pętli animacji niezależnie od odświeżania ekranu.
    gsap.ticker.add((time, deltaTime, frame) => this.tick(deltaTime));
  }

  tick(deltaTime) {
    // deltaTime to czas między klatkami w milisekundach (dla GSAP ticker)
    // Czasem GSAP podaje to w sekundach, ale standardowo jest to czas ticku (zależny od wersji, zwykle w ms).
    // GSAP 3.x domyślnie deltaTime to ms, ale by być bezpiecznym, możemy wziąć ui.getAngularVelocity() * (deltaTime / 1000)
    
    // Obliczamy przyrost kąta
    const dtSeconds = deltaTime / 1000;
    const angularVelocity = this.ui.getAngularVelocity();
    
    if (angularVelocity > 0) {
      this.currentAngle += angularVelocity * dtSeconds;
    }

    // Aktualizujemy pozycję elementów modelu prasy
    this.pressModel.update(this.currentAngle);

    // Wyliczamy przesunięcie do wyświetlenia w UI
    const displacement = PhysicsEngine.calculateSliderPosition(this.currentAngle, this.pressModel.r, this.pressModel.l);
    
    // Aktualizujemy dane w UI
    this.ui.updateTelemetry(this.currentAngle, displacement);

    // Renderujemy klatkę
    this.sceneSetup.render();
  }
}

// Inicjalizacja aplikacji po załadowaniu DOM (choć moduł ładuje się defer)
document.addEventListener('DOMContentLoaded', () => {
  new Application();
});
