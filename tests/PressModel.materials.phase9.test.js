// @vitest-environment jsdom
// Phase 9-01 MAT-01..03 / D-Phase9-01 + D-Phase9-04:
// PBR per grupa (3 grupy) + procedural concrete normalMap.
//
//   Grupa A — Metalik (6 materiałów): metalness 0.8, roughness 0.5, color 0x4a4a4a
//     matBody, matShaft, matEccentric, matSlider, matFlywheel, matBrakeSteel
//   Grupa B — Plastik / BHP (4 materiały): metalness 0.1, roughness 0.85
//     matSafetyPanelGray, matSwitchBody, matGuardOrange (color 0xC8B400 BHP yellow), matGuardRearBlack
//   Grupa C — Beton (1 materiał + normalMap): metalness 0, roughness 0.95, color 0x808080
//     matFoundation + normalMap DataTexture 256x256, normalScale (0.3, 0.3)
//
// Regression guards (NIE zmieniane): matEStopRed 0xD55E00, matSafetyButtonGreen 0x009E73.
// Dispose path: MaterialRegistry trackTexture('concrete-normal', ...).

// Canvas mock — _buildNameplate() woła getContext('2d')
const mock2DContext = {
  fillStyle: '', strokeStyle: '', lineWidth: 0, font: '', textBaseline: '',
  imageSmoothingEnabled: true,
  fillRect: () => {}, strokeRect: () => {}, fillText: () => {},
};
HTMLCanvasElement.prototype.getContext = function(type) {
  if (type === '2d') return mock2DContext;
  return null;
};

import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';

function makePressModel() {
  const scene = new THREE.Scene();
  return new PressModel(scene);
}

describe('PressModel — Phase 9-01 MAT-01 Grupa A (Metalik)', () => {
  let pressModel;
  beforeEach(() => { pressModel = makePressModel(); });

  const grupaA = ['matBody', 'matShaft', 'matEccentric', 'matSlider', 'matFlywheel', 'matBrakeSteel'];

  for (const matName of grupaA) {
    it(`#A: ${matName} ma metalness 0.8, roughness 0.5, color 0x4a4a4a`, () => {
      const mat = pressModel[matName];
      expect(mat).toBeDefined();
      expect(mat.metalness).toBeCloseTo(0.8, 5);
      expect(mat.roughness).toBeCloseTo(0.5, 5);
      expect(mat.color.getHex()).toBe(0x4a4a4a);
    });
  }
});

describe('PressModel — Phase 9-01 MAT-02 Grupa B (Plastik / BHP)', () => {
  let pressModel;
  beforeEach(() => { pressModel = makePressModel(); });

  const grupaB = ['matSafetyPanelGray', 'matSwitchBody', 'matGuardOrange', 'matGuardRearBlack'];

  for (const matName of grupaB) {
    it(`#B: ${matName} ma metalness 0.1, roughness 0.85`, () => {
      const mat = pressModel[matName];
      expect(mat).toBeDefined();
      expect(mat.metalness).toBeCloseTo(0.1, 5);
      expect(mat.roughness).toBeCloseTo(0.85, 5);
    });
  }

  it('#B: matGuardOrange ma BHP ostrzegawczy żółty 0xC8B400 (override z 0xE07A1F)', () => {
    expect(pressModel.matGuardOrange.color.getHex()).toBe(0xC8B400);
  });
});

describe('PressModel — Phase 9-01 MAT-03 Grupa C (Beton + normalMap)', () => {
  let pressModel;
  beforeEach(() => { pressModel = makePressModel(); });

  it('#C1: matFoundation istnieje jako pole instancji', () => {
    expect(pressModel.matFoundation).toBeDefined();
    expect(pressModel.matFoundation).toBeInstanceOf(THREE.MeshStandardMaterial);
  });

  it('#C2: matFoundation ma metalness 0, roughness 0.95, color 0x808080', () => {
    const mat = pressModel.matFoundation;
    expect(mat.metalness).toBeCloseTo(0.0, 5);
    expect(mat.roughness).toBeCloseTo(0.95, 5);
    expect(mat.color.getHex()).toBe(0x808080);
  });

  it('#C3: matFoundation.normalMap to DataTexture 256x256', () => {
    const mat = pressModel.matFoundation;
    expect(mat.normalMap).toBeDefined();
    expect(mat.normalMap).not.toBeNull();
    expect(mat.normalMap.image).toBeDefined();
    expect(mat.normalMap.image.width).toBe(256);
    expect(mat.normalMap.image.height).toBe(256);
  });

  it('#C4: matFoundation.normalScale to Vector2 (0.3, 0.3)', () => {
    const mat = pressModel.matFoundation;
    expect(mat.normalScale).toBeInstanceOf(THREE.Vector2);
    expect(mat.normalScale.x).toBeCloseTo(0.3, 5);
    expect(mat.normalScale.y).toBeCloseTo(0.3, 5);
  });
});

describe('PressModel — Phase 9-01 regression guards (Wong palette niezmieniona)', () => {
  let pressModel;
  beforeEach(() => { pressModel = makePressModel(); });

  it('#REG1: matEStopRed color 0xD55E00 (Wong) niezmienione', () => {
    expect(pressModel.matEStopRed.color.getHex()).toBe(0xD55E00);
  });

  it('#REG2: matSafetyButtonGreen color 0x009E73 (Wong) niezmienione', () => {
    expect(pressModel.matSafetyButtonGreen.color.getHex()).toBe(0x009E73);
  });
});

describe('PressModel — Phase 9-01 dispose path (concrete normal map)', () => {
  let pressModel;
  beforeEach(() => { pressModel = makePressModel(); });

  it('#D1: MaterialRegistry rejestruje concrete normal DataTexture', () => {
    // Sprawdź czy textura 'concrete-normal' została zarejestrowana.
    expect(pressModel.materialRegistry._textures.has('concrete-normal')).toBe(true);
    const tex = pressModel.materialRegistry._textures.get('concrete-normal');
    expect(tex).toBe(pressModel.matFoundation.normalMap);
  });
});
