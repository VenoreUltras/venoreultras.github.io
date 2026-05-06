// src/MaterialRegistry.js
//
// CRIT-6 invariant: per-mesh cloned MeshStandardMaterial.
// Każdy interactable dostaje swój clone — bez tego HighlightManager (Phase 4) zaświeciłby wszystko naraz.
// Dispose path zapobiega leakowi GPU buffers przy Vite HMR (TWIN-11 SC5).

/**
 * Centralny rejestr sklonowanych materiałów i textur dla interactable meshów.
 * Implementuje CRIT-6 (klonowanie per-mesh) oraz TWIN-11 dispose path.
 */
export class MaterialRegistry {
  constructor() {
    /** @type {Map<string, THREE.Material>} Sklonowane materiały indeksowane po meshId */
    this._materials = new Map();
    /** @type {Map<string, THREE.Texture>} Textury do dispose (CanvasTexture path, Wave 3) */
    this._textures = new Map();
  }

  /**
   * Zwraca sklonowany materiał dla podanego meshId.
   * Idempotentne — kolejne wywołania z tym samym meshId zwracają zacachowany clone.
   * @param {THREE.Material} baseMaterial - Bazowy materiał do sklonowania
   * @param {string} meshId - Unikalny identyfikator mesha (kebab-case)
   * @returns {THREE.Material} Sklonowany materiał
   */
  getCloned(baseMaterial, meshId) {
    if (this._materials.has(meshId)) {
      return this._materials.get(meshId);
    }
    const cloned = baseMaterial.clone();
    this._materials.set(meshId, cloned);
    return cloned;
  }

  /**
   * Rejestruje materiał który nie pochodzi z klonowania (np. MeshBasicMaterial tabliczki
   * znamionowej) — tak by disposeAll() go objął i size() liczyło go jako interactable.
   * [Rule 2 - Missing] Tabliczka-znamionowa MeshBasicMaterial musi być dispose'owany razem
   * z pozostałymi 14 klonowanymi materiałami (TWIN-11 SC5 completeness).
   * @param {string} meshId - Identyfikator mesha
   * @param {THREE.Material} material - Materiał do śledzenia
   */
  trackMaterial(meshId, material) {
    if (!this._materials.has(meshId)) {
      this._materials.set(meshId, material);
    }
  }

  /**
   * Rejestruje texturę pod danym meshId do późniejszego dispose.
   * Używane przez CanvasTexture tabliczki znamionowej (Wave 3).
   * @param {string} meshId - Identyfikator mesha
   * @param {THREE.Texture} texture - Textura do śledzenia
   */
  trackTexture(meshId, texture) {
    this._textures.set(meshId, texture);
  }

  /**
   * Dispose wszystkich materiałów i textur, czyści obie Mapy.
   * Wplecione w main.js Application.dispose() w planie 02-06.
   */
  disposeAll() {
    for (const material of this._materials.values()) {
      material.dispose();
    }
    for (const texture of this._textures.values()) {
      texture.dispose();
    }
    this._materials.clear();
    this._textures.clear();
  }

  /**
   * Zwraca liczbę zarejestrowanych sklonowanych materiałów.
   * Używane przez smoke testy do diagnostyki (registry.size() === 15 po buildPress()).
   * @returns {number}
   */
  size() {
    return this._materials.size;
  }
}
