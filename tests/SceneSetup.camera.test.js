// Phase 7 Plan 01 — Camera re-orient na side-view (D-Phase7-01).
// Static text-scan (wzorzec z application.test.js) — unika WebGLRenderer w jsdom (MOD-6).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('SceneSetup — Phase 7 side-view camera (D-Phase7-01)', () => {
  const src = readFileSync('src/SceneSetup.js', 'utf-8');

  it('kamera ustawiona na (20, 5, 0) — patrzymy z dodatniej osi X', () => {
    // Akceptujemy elastyczne whitespace; wymuszamy konkretne wartości (20, 5, 0).
    expect(src).toMatch(/camera\.position\.set\(\s*20\s*,\s*5\s*,\s*0\s*\)/);
    // Stary front-view (0, 5, 20) NIE może już istnieć.
    expect(src).not.toMatch(/camera\.position\.set\(\s*0\s*,\s*5\s*,\s*20\s*\)/);
  });

  it('OrbitControls target pozostaje (0, 4, 0) — centrum prasy', () => {
    expect(src).toMatch(/controls\.target\.set\(\s*0\s*,\s*4\s*,\s*0\s*\)/);
  });

  it('PerspectiveCamera signature niezmieniona (fov=45, near=0.1, far=1000)', () => {
    expect(src).toMatch(/new THREE\.PerspectiveCamera\(\s*45\s*,/);
    expect(src).toMatch(/0\.1\s*,\s*1000/);
  });

  it('OrbitControls min/max distance + maxPolarAngle bez zmian (5 / 60 / π·0.49)', () => {
    expect(src).toMatch(/minDistance\s*=\s*5/);
    expect(src).toMatch(/maxDistance\s*=\s*60/);
    expect(src).toMatch(/maxPolarAngle\s*=\s*Math\.PI\s*\*\s*0\.49/);
  });

  it('komentarz D-Phase7-01 jako // (NIE string literal — UI-06 boundary scanner)', () => {
    // Komentarz musi istnieć i być prefiksowany //, nie zawarty w stringu.
    expect(src).toMatch(/\/\/[^'"\n]*D-Phase7-01/);
  });
});
