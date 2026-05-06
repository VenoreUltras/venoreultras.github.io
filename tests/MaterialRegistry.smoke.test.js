import { describe, it, expect, vi } from 'vitest';
import { MaterialRegistry } from '../src/MaterialRegistry.js';

function makeFakeMaterial() {
  // Każdy clone() zwraca nowy obiekt z własnym dispose spy
  return {
    dispose: vi.fn(),
    clone() { return { dispose: vi.fn(), _isClone: true }; },
  };
}

function makeFakeTexture() {
  return { dispose: vi.fn() };
}

describe('MaterialRegistry — smoke (TWIN-11)', () => {
  it('konstruktor: size() === 0', () => {
    const r = new MaterialRegistry();
    expect(r.size()).toBe(0);
  });

  it('getCloned: zwraca clone ≠ base, idempotent per meshId', () => {
    const r = new MaterialRegistry();
    const base = makeFakeMaterial();
    const c1 = r.getCloned(base, 'foo');
    expect(c1).not.toBe(base);
    expect(c1._isClone).toBe(true);
    const c2 = r.getCloned(base, 'foo');
    expect(c2).toBe(c1); // cached
    const c3 = r.getCloned(base, 'bar');
    expect(c3).not.toBe(c1);
    expect(r.size()).toBe(2);
  });

  it('disposeAll: woła dispose na materiałach + texturach, czyści mapy', () => {
    const r = new MaterialRegistry();
    const base = makeFakeMaterial();
    const c1 = r.getCloned(base, 'foo');
    const c2 = r.getCloned(base, 'bar');
    const tex = makeFakeTexture();
    r.trackTexture('foo', tex);

    r.disposeAll();

    expect(c1.dispose).toHaveBeenCalledTimes(1);
    expect(c2.dispose).toHaveBeenCalledTimes(1);
    expect(tex.dispose).toHaveBeenCalledTimes(1);
    expect(r.size()).toBe(0);
  });
});
