// @vitest-environment jsdom
// Phase 14 NAME-01: tabliczka znamionowa laduje teksture z public/media/ przez
// THREE.TextureLoader (placeholder PNG pod nazwa .webp), zamiast proceduralnego
// CanvasTexture. Asercje kontraktu: MeshBasicMaterial bez emissive (EmissiveController
// guard), colorSpace SRGB ustawiony synchronicznie, trackTexture/trackMaterial +
// dispose path, baseMaterial:null path (invariant 15), rotacja/pozycja plyty bez zmian.
//
// jsdom nie pobiera assetow sieciowych — mockujemy THREE.TextureLoader.prototype.load
// aby (a) zweryfikowac URL '/media/tabliczka-znamionowa.webp', (b) zwrocic prawdziwy
// THREE.Texture (zeby colorSpace/dispose dzialaly), bez faktycznego fetchowania.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { PressModel } from '../src/PressModel.js';

const NAMEPLATE_URL = '/media/tabliczka-znamionowa.webp';

describe('PressModel — Phase 14 NAME-01 (tabliczka przez TextureLoader)', () => {
  let scene;
  let pressModel;
  let loadSpy;
  let loadedUrls;

  beforeEach(() => {
    loadedUrls = [];
    // Mock TextureLoader.load: zwraca prawdziwa THREE.Texture (placeholder pixel),
    // rejestruje URL. NIE wykonujemy onLoad (jsdom = brak fetch) — synchroniczny
    // colorSpace musi byc ustawiony w _buildNameplate niezaleznie od callbacka.
    loadSpy = vi
      .spyOn(THREE.TextureLoader.prototype, 'load')
      .mockImplementation(function (url) {
        loadedUrls.push(url);
        return new THREE.Texture();
      });
    scene = new THREE.Scene();
    pressModel = new PressModel(scene);
  });

  afterEach(() => {
    loadSpy.mockRestore();
  });

  it('laduje teksture przez TextureLoader z root-relative URL public/media', () => {
    expect(loadSpy).toHaveBeenCalled();
    expect(loadedUrls).toContain(NAMEPLATE_URL);
  });

  it('tabliczka uzywa MeshBasicMaterial BEZ pola emissive (EmissiveController guard)', () => {
    const nameplate = pressModel.getInteractables().get('tabliczka-znamionowa');
    expect(nameplate.material).toBeInstanceOf(THREE.MeshBasicMaterial);
    expect(nameplate.material.emissive).toBeUndefined();
  });

  it('mapowana tekstura ma colorSpace === SRGBColorSpace (ustawione synchronicznie)', () => {
    const nameplate = pressModel.getInteractables().get('tabliczka-znamionowa');
    const texture = nameplate.material.map;
    expect(texture).toBeDefined();
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('MaterialRegistry sledzi teksture i material tabliczki (size = 15)', () => {
    expect(pressModel.materialRegistry.size()).toBe(15);
    const nameplate = pressModel.getInteractables().get('tabliczka-znamionowa');
    // Tekstura zarejestrowana = jest dispose'owana razem z reszta.
    expect(nameplate.material.map).toBeDefined();
  });

  it('getInteractables().size === 15 (invariant niezmieniony)', () => {
    expect(pressModel.getInteractables().size).toBe(15);
  });

  it('plyta: rotacja Y ≈ Math.PI*0.05 oraz pozycja (-3.05, 5.5, 0.05) bez zmian', () => {
    const nameplate = pressModel.getInteractables().get('tabliczka-znamionowa');
    expect(nameplate.rotation.y).toBeCloseTo(Math.PI * 0.05, 6);
    expect(nameplate.position.x).toBeCloseTo(-3.05, 6);
    expect(nameplate.position.y).toBeCloseTo(5.5, 6);
    expect(nameplate.position.z).toBeCloseTo(0.05, 6);
  });

  it('disposeMaterials() zwalnia teksture tabliczki (brak leaku GPU)', () => {
    const nameplate = pressModel.getInteractables().get('tabliczka-znamionowa');
    const texSpy = vi.spyOn(nameplate.material.map, 'dispose');
    pressModel.disposeMaterials();
    expect(texSpy).toHaveBeenCalledTimes(1);
  });
});
