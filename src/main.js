// Style ładowane przez index.html (link rel=stylesheet href="/style.css") — root style.css jest jedynym source of truth (Phase Z hygiene).
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
    // GSAP 3.x ticker: deltaTime w milisekundach (kontrakt zablokowany ~3.15.0 pin w package.json — INFRA-03).
    const dtSeconds = deltaTime / 1000;
    const angularVelocity = this.ui.getAngularVelocity();

    if (angularVelocity > 0) {
      this.currentAngle = (this.currentAngle + angularVelocity * dtSeconds) % (Math.PI * 2);
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
