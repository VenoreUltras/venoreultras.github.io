import * as THREE from 'three';
import { PhysicsEngine } from './PhysicsEngine';

export class PressModel {
  constructor(scene) {
    this.scene = scene;
    
    // ==========================================
    // PARAMETRY MASZYNY (MOŻESZ ZMIENIAĆ TUTAJ)
    // ==========================================
    this.r = 0.8;      // Promień mimośrodu (połowa skoku prasy)
    this.l = 4.0;      // Długość korbowodu
    this.shaftY = 8.0; // Wysokość wału nad podstawą
    // ==========================================

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.buildMaterials();
    this.buildPress();
  }

  buildMaterials() {
    this.matBody = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 });
    this.matShaft = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    this.matEccentric = new THREE.MeshStandardMaterial({ color: 0xaa3333, metalness: 0.5 });
    this.matRod = new THREE.MeshStandardMaterial({ color: 0x3333aa, metalness: 0.5 });
    this.matSlider = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.4 });
    this.matBase = new THREE.MeshStandardMaterial({ color: 0x333333 });
  }

  buildPress() {
    // 1. Podstawa i korpus (Body)
    const baseGeo = new THREE.BoxGeometry(6, 1, 4);
    const base = new THREE.Mesh(baseGeo, this.matBase);
    base.position.y = 0.5;
    base.receiveShadow = true;
    this.group.add(base);

    const frameGeo = new THREE.BoxGeometry(2, this.shaftY + 2, 2);
    const leftFrame = new THREE.Mesh(frameGeo, this.matBody);
    leftFrame.position.set(-2, (this.shaftY + 2)/2, -1);
    leftFrame.castShadow = true;
    leftFrame.receiveShadow = true;
    this.group.add(leftFrame);

    const rightFrame = new THREE.Mesh(frameGeo, this.matBody);
    rightFrame.position.set(2, (this.shaftY + 2)/2, -1);
    rightFrame.castShadow = true;
    rightFrame.receiveShadow = true;
    this.group.add(rightFrame);

    const topFrameGeo = new THREE.BoxGeometry(6, 1, 2);
    const topFrame = new THREE.Mesh(topFrameGeo, this.matBody);
    topFrame.position.set(0, this.shaftY + 1.5, -1);
    topFrame.castShadow = true;
    topFrame.receiveShadow = true;
    this.group.add(topFrame);

    // 2. Wał główny (Shaft) - oś obrotu
    // Wał przechodzi od lewej do prawej ramki
    this.shaftAxis = new THREE.Group();
    this.shaftAxis.position.set(0, this.shaftY, 0);
    this.group.add(this.shaftAxis);

    const shaftGeo = new THREE.CylinderGeometry(0.4, 0.4, 4.5, 32);
    shaftGeo.rotateZ(Math.PI / 2); // Układamy poziomo
    const shaft = new THREE.Mesh(shaftGeo, this.matShaft);
    shaft.castShadow = true;
    this.shaftAxis.add(shaft);

    // 3. Mimośród (Eccentric)
    // Tworzymy grupę mimośrodu jako dziecko wału. Kręci się razem z wałem.
    const eccentricGeo = new THREE.CylinderGeometry(this.r + 0.3, this.r + 0.3, 1, 32);
    eccentricGeo.rotateZ(Math.PI / 2);
    const eccentric = new THREE.Mesh(eccentricGeo, this.matEccentric);
    
    // Przesunięcie środka mimośrodu względem osi obrotu wału o r
    // W początkowym stanie (angle=0), niech będzie w górze. Zatem na osi Y rośnie.
    eccentric.position.set(0, this.r, 0);
    eccentric.castShadow = true;
    this.shaftAxis.add(eccentric);

    // Aby łatwo określać położenie punktu mocowania korbowodu:
    this.eccentricPin = new THREE.Object3D();
    this.eccentricPin.position.set(0, this.r, 0);
    this.shaftAxis.add(this.eccentricPin);

    // 4. Korbowód (Connecting Rod)
    this.rod = new THREE.Group();
    this.group.add(this.rod);

    const rodMeshGeo = new THREE.CylinderGeometry(0.2, 0.2, this.l, 16);
    // Przesuwamy geometrię tak, żeby punkt zaczepienia był na górze (0,0,0) zamiast w środku
    rodMeshGeo.translate(0, -this.l / 2, 0);
    const rodMesh = new THREE.Mesh(rodMeshGeo, this.matRod);
    rodMesh.castShadow = true;
    this.rod.add(rodMesh);

    // 5. Suwak (Slider)
    const sliderGeo = new THREE.BoxGeometry(2, 1.5, 1.5);
    this.slider = new THREE.Mesh(sliderGeo, this.matSlider);
    this.slider.castShadow = true;
    this.group.add(this.slider);
    
    // Prowadnice suwaka
    const guideGeo = new THREE.BoxGeometry(0.5, 5, 0.5);
    const leftGuide = new THREE.Mesh(guideGeo, this.matBody);
    leftGuide.position.set(-1.3, this.shaftY - 3, 0);
    this.group.add(leftGuide);
    const rightGuide = new THREE.Mesh(guideGeo, this.matBody);
    rightGuide.position.set(1.3, this.shaftY - 3, 0);
    this.group.add(rightGuide);

    // Inicjalizacja położenia
    this.update(0);
  }

  /**
   * Aktualizuje pozycje elementów maszyny na podstawie kąta obrotu wału.
   * @param {number} angle - Kąt obrotu wału (radiany)
   */
  update(angle) {
    // Wał obraca się wokół własnej osi (Z)
    this.shaftAxis.rotation.z = -angle;

    // Pobieramy aktualną globalną pozycję sworznia mimośrodu
    const pinPosition = new THREE.Vector3();
    this.eccentricPin.getWorldPosition(pinPosition);

    // Obliczamy pozycję y suwaka używając PhysicsEngine (odległość od wału w dół)
    // Fizyka operuje w płaszczyźnie, zakładamy że wał jest w (0,0)
    // Ze wzoru: pozycja dolna to y = r * cos(alpha) + sqrt(l^2 - (r * sin(alpha))^2)
    // Skoro nasze 0 to shaftY, suwak znajduje się na Y = shaftY - y
    const currentY = PhysicsEngine.calculateSliderPosition(angle, this.r, this.l);
    this.slider.position.y = this.shaftY - currentY;
    
    // Suwak porusza się tylko w pionie
    this.slider.position.x = 0;
    this.slider.position.z = 0;

    // Korbowód łączy sworzeń mimośrodu z suwakiem.
    // Ustawiamy górny koniec korbowodu na pinPosition
    this.rod.position.copy(pinPosition);
    
    // Obliczamy kąt odchylenia korbowodu
    // Różnica w X między suwakiem a sworzniem (X sworznia to r * -sin(angle))
    const dx = this.slider.position.x - pinPosition.x;
    const dy = this.slider.position.y - pinPosition.y;
    // Kąt odchylenia korbowodu od pionu
    const rodAngle = Math.atan2(dx, -dy); 
    this.rod.rotation.z = rodAngle;
  }
}
