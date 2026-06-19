// tests/MediaManager.test.js
// @vitest-environment node
// Phase 16 Plan 16-01 (MED-01/MED-03): MediaManager — resolveSrc + validateSrc + dispose.
// DI: fetchImpl wstrzykiwany przez vi.fn() — pełna testowalność bez sieci.

import { describe, it, expect, vi } from 'vitest';
import { MediaManager } from '../src/media/MediaManager.js';

describe('MediaManager.resolveSrc (MED-01)', () => {
  it("resolveSrc('photo.webp') returns '/media/photo.webp'", () => {
    const mm = new MediaManager({ fetchImpl: vi.fn() });
    expect(mm.resolveSrc('photo.webp')).toBe('/media/photo.webp');
  });
});

describe('MediaManager.validateSrc (MED-03)', () => {
  it('resolves true when fetchImpl HEAD responds ok, and calls fetch with HEAD', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const mm = new MediaManager({ fetchImpl });
    const result = await mm.validateSrc('/media/photo.webp');
    expect(result).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith('/media/photo.webp', { method: 'HEAD' });
  });

  it('resolves false when fetchImpl responds not-ok (404)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });
    const mm = new MediaManager({ fetchImpl });
    expect(await mm.validateSrc('/media/missing.webp')).toBe(false);
  });

  it('resolves false when fetchImpl rejects (network error / offline)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network'));
    const mm = new MediaManager({ fetchImpl });
    expect(await mm.validateSrc('/media/photo.webp')).toBe(false);
  });
});

describe('MediaManager.dispose', () => {
  it('is callable (no-op, Phase 17 dispose-chain uniformity)', () => {
    const mm = new MediaManager({ fetchImpl: vi.fn() });
    expect(() => mm.dispose()).not.toThrow();
  });
});
