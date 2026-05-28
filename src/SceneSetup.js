import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from 'gsap';
import { pl } from './i18n/pl.js';

export class SceneSetup {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`Container #${containerId} not found`);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Kamera
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    // D-Phase7-01: side-view kamera — patrzymy z dodatniej osi X. Flywheel widoczny jak tarcza zegara front-facing.
    this.camera.position.set(20, 5, 0);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 4, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.update();

    // INFRA-05: WebGL context-loss handling.
    // KRYTYCZNE: event.preventDefault() w pierwszej linii listener'a — bez tego
    // browser może odmówic restore (Pitfall 7 / CRIT-5).
    this._overlayEl = this._createWebglOverlay();
    this._onContextLost = (event) => {
      event.preventDefault();
      gsap.ticker.sleep();
      this._showOverlay();
    };
    this._onContextRestored = () => {
      gsap.ticker.wake();
      this._hideOverlay();
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this._onContextLost, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', this._onContextRestored, false);

    // Światła
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    // Siatka i osie (inżynierski wygląd)
    const gridHelper = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
    this.scene.add(gridHelper);

    // Bound reference dla późniejszego dispose() (STATE-03 / T-04-02).
    // Anonymous bind utraciłby reference i removeEventListener byłby no-op.
    this._onWindowResizeBound = this.onWindowResize.bind(this);
    window.addEventListener('resize', this._onWindowResizeBound);
  }

  onWindowResize() {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  render() {
    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /** Tworzy overlay element WebGL context-loss (hidden by default). */
  _createWebglOverlay() {
    let el = document.getElementById('webgl-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'webgl-overlay';
      el.className = 'webgl-overlay webgl-overlay--hidden';
      el.setAttribute('role', 'alert');
      el.textContent = pl.webgl.contextLost;
      document.body.appendChild(el);
    }
    return el;
  }

  _showOverlay() {
    if (this._overlayEl) this._overlayEl.classList.remove('webgl-overlay--hidden');
  }

  _hideOverlay() {
    if (this._overlayEl) this._overlayEl.classList.add('webgl-overlay--hidden');
  }

  /**
   * Zwalnia zasoby SceneSetup (STATE-03). Plan 05 rozszerzony o WebGL
   * context-loss listenery (webglcontextlost / webglcontextrestored)
   * + usunięcie overlay z DOM.
   */
  dispose() {
    window.removeEventListener('resize', this._onWindowResizeBound);
    // INFRA-05 cleanup
    this.renderer.domElement.removeEventListener('webglcontextlost', this._onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this._onContextRestored);
    if (this._overlayEl && this._overlayEl.parentNode) {
      this._overlayEl.parentNode.removeChild(this._overlayEl);
    }
    if (this.controls) this.controls.dispose();
    this.renderer.dispose();
  }
}
