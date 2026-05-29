// @vitest-environment jsdom
// Phase 2 smoke: TWIN-11/12/13 contract enforcement.
// Bez WebGLRenderer (PITFALLS MOD-6); pure scene graph + identity assertions.
//
// [Rule 3 - Blocker Fix] jsdom nie implementuje HTMLCanvasElement.getContext() bez pakietu canvas.
// _buildNameplate() woła getContext('2d') — mock zwraca no-op context 2D aby uniknac TypeError.
// Texture (CanvasTexture) i tak powstaje (THREE nie sprawdza pixeli w jsdom), dispose path dziala.

// Canvas mock — musi być PRZED importami Three.js/PressModel (hoisting przez vitest).
const mock2DContext = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 0,
  font: '',
  textBaseline: '',
  imageSmoothingEnabled: true,
  fillRect: () => {},
  strokeRect: () => {},
  fillText: () => {},
};
HTMLCanvasElement.prototype.getContext = function(type) {
  if (type === '2d') return mock2DContext;
  return null;
};

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';

const EXPECTED_IDS = [
  'kolo-zamachowe', 'dzwignia-sprzegla', 'hamulec', 'wziernik-smarowania',
  'oslona-przednia', 'oslona-tylna', 'kurtyna-lewa', 'kurtyna-prawa',
  'panel-oburezny', 'przycisk-start-lewy', 'przycisk-start-prawy',
  'lampka-gotowosci', 'estop', 'wylacznik-glowny', 'tabliczka-znamionowa',
];

const MANIPULATION_IDS = new Set([
  'dzwignia-sprzegla', 'hamulec', 'oslona-przednia', 'przycisk-start-lewy',
  'przycisk-start-prawy', 'estop', 'wylacznik-glowny',
]);

const VISUAL_TARGET_IDS = new Set([
  'kolo-zamachowe', 'wziernik-smarowania', 'oslona-tylna', 'kurtyna-lewa',
  'kurtyna-prawa', 'panel-oburezny', 'lampka-gotowosci', 'tabliczka-znamionowa',
]);

const POSES_IDS = new Set(['oslona-przednia', 'wylacznik-glowny', 'dzwignia-sprzegla']);

describe('PressModel — Phase 2 smoke (TWIN-11/12/13)', () => {
  let scene;
  let pressModel;

  beforeEach(() => {
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
  });

  it('TWIN-12: getInteractables() zwraca 15 wpisow z poprawnymi ID', () => {
    const interactables = pressModel.getInteractables();
    expect(interactables.size).toBe(15);
    for (const id of EXPECTED_IDS) {
      expect(interactables.has(id), `missing mesh: ${id}`).toBe(true);
    }
  });

  it('TWIN-12: getMeshDictionary() ma 15 wpisow z {labelPL, descriptionPL, kind}', () => {
    const dict = pressModel.getMeshDictionary();
    expect(dict.size).toBe(15);
    for (const [id, entry] of dict) {
      expect(entry.labelPL, `${id} labelPL empty`).toBeTruthy();
      expect(entry.descriptionPL, `${id} descriptionPL empty`).toBeTruthy();
      expect(['manipulation', 'visual-target']).toContain(entry.kind);
    }
  });

  it('TWIN-12: stable references — getInteractables() zwraca to samo Map przy wielokrotnych wywolaniach', () => {
    const a = pressModel.getInteractables();
    const b = pressModel.getInteractables();
    expect(a).toBe(b);
    const da = pressModel.getMeshDictionary();
    const db = pressModel.getMeshDictionary();
    expect(da).toBe(db);
  });

  it('TWIN-13: userData kontrakt identity-only (CRIT-7)', () => {
    for (const [id, mesh] of pressModel.getInteractables()) {
      // identity fields
      expect(mesh.userData.id).toBe(id);
      expect(['manipulation', 'visual-target']).toContain(mesh.userData.kind);
      expect(mesh.userData.labelPL).toBeTruthy();
      expect(mesh.userData.descriptionPL).toBeTruthy();

      // kind correctness per D-Phase2-09
      if (MANIPULATION_IDS.has(id)) expect(mesh.userData.kind).toBe('manipulation');
      if (VISUAL_TARGET_IDS.has(id)) expect(mesh.userData.kind).toBe('visual-target');

      // restPosition plain object format (CONTEXT specifics)
      expect(mesh.userData.restPosition).toBeDefined();
      expect(mesh.userData.restPosition.pos).toEqual(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) })
      );
      expect(mesh.userData.restPosition.rot).toEqual(
        expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) })
      );

      // CRIT-7: NO live status keys (paranoid enumerate)
      for (const forbidden of ['state', 'isOpen', 'value', 'status', 'currentPose', 'isHighlighted']) {
        expect(mesh.userData, `${id} userData has forbidden key '${forbidden}'`).not.toHaveProperty(forbidden);
      }
    }
  });

  it('TWIN-13: ruchome interactable maja userData.poses jako plain object definicje', () => {
    const interactables = pressModel.getInteractables();
    for (const id of POSES_IDS) {
      const mesh = interactables.get(id);
      expect(mesh.userData.poses, `${id} brak poses`).toBeDefined();
      // kazdy pose ma rot.x/y/z (plain numbers)
      for (const poseName of Object.keys(mesh.userData.poses)) {
        const pose = mesh.userData.poses[poseName];
        expect(pose.rot).toEqual(
          expect.objectContaining({ x: expect.any(Number), y: expect.any(Number), z: expect.any(Number) })
        );
      }
    }
    // Specific pose names per UI-SPEC Default Pose
    expect(Object.keys(interactables.get('oslona-przednia').userData.poses).sort()).toEqual(['closed', 'open']);
    expect(Object.keys(interactables.get('wylacznik-glowny').userData.poses).sort()).toEqual(['off', 'on']);
    expect(Object.keys(interactables.get('dzwignia-sprzegla').userData.poses).sort()).toEqual(['engaged', 'released']);
  });

  it('TWIN-11 SC3: cloned materials — flywheel.material !== estop.material', () => {
    const flywheel = pressModel.getInteractables().get('kolo-zamachowe');
    const eStop = pressModel.getInteractables().get('estop');
    expect(flywheel.material).not.toBe(eStop.material);
  });

  it('TWIN-11 paranoid: zadne dwa interactable nie wspoldziela material reference (105-par)', () => {
    const meshes = [...pressModel.getInteractables().values()];
    expect(meshes.length).toBe(15);
    for (let i = 0; i < meshes.length; i++) {
      for (let j = i + 1; j < meshes.length; j++) {
        expect(
          meshes[i].material,
          `${meshes[i].userData.id} <-> ${meshes[j].userData.id} share material reference`
        ).not.toBe(meshes[j].material);
      }
    }
  });

  it('TWIN-11 SC5: disposeMaterials() wola dispose() na kazdym sklonowanym materiale', () => {
    const materials = [...pressModel.getInteractables().values()].map(m => m.material);
    const spies = materials.map(m => vi.spyOn(m, 'dispose'));

    pressModel.disposeMaterials();

    for (const spy of spies) expect(spy).toHaveBeenCalledTimes(1);
    expect(pressModel.materialRegistry.size()).toBe(0);
  });

  it('TWIN-10/11: tabliczka znamionowa CanvasTexture dispose path', () => {
    const nameplate = pressModel.getInteractables().get('tabliczka-znamionowa');
    expect(nameplate.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    const texture = nameplate.material.map;
    expect(texture).toBeDefined();
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);

    const texSpy = vi.spyOn(texture, 'dispose');
    pressModel.disposeMaterials();
    expect(texSpy).toHaveBeenCalledTimes(1);
  });

  it('TWIN-11 SC5: HMR cycle — rebuild po dispose nie rosnie material count', () => {
    pressModel.disposeMaterials();
    const newPress = new PressModel(scene);
    expect(newPress.getInteractables().size).toBe(15);
    expect(newPress.materialRegistry.size()).toBe(15);
  });

  it('UI-SPEC negative criteria: lampka-gotowosci nie swieci w Phase 2 (Phase 4 territory)', () => {
    const lamp = pressModel.getInteractables().get('lampka-gotowosci');
    expect(lamp.material.emissiveIntensity ?? 0).toBe(0);
    // emissive #000000 -> getHex() === 0
    expect(lamp.material.emissive.getHex()).toBe(0x000000);
  });

  it('CRIT-7: Phase 1 brownfield meshes (shaft/eccentric/rod/slider) zostaly niezmienione (nie sa w interactables)', () => {
    const interactables = pressModel.getInteractables();
    // Phase 1 meshes NIE powinny byc rejestrowane (sa non-interactable structural)
    expect(interactables.has('shaft')).toBe(false);
    expect(interactables.has('eccentric')).toBe(false);
    expect(interactables.has('rod')).toBe(false);
    expect(interactables.has('slider')).toBe(false);
  });

  it('TWIN-13 (Phase 10 D-10-11): nowe łączniki i wspornik NIE powiększają interactables map', () => {
    // D-10-11 eksplicytna asercja: kołnierze, czop i wspornik dźwigni to decoration only.
    // Mapa getInteractables() NIE może zawierać kluczy dla nowych mesh-y Phase 10.
    const interactables = pressModel.getInteractables();
    // Klucze których NIE może być (nowe mesh-y Phase 10 nie dostały id interactable).
    const phase10NonInteractableKeys = [
      'shaft-eccentric-flange-left', 'shaft-eccentric-flange-right',
      'eccentric-rod-pin', 'lever-bracket',
    ];
    for (const key of phase10NonInteractableKeys) {
      expect(interactables.has(key), `interactables NIE powinno zawierać klucza '${key}' (decoration Phase 10)`).toBe(false);
    }
    // Kontrakt rozmiarowy musi zostać nienaruszony.
    expect(interactables.size).toBe(15);
  });
});
