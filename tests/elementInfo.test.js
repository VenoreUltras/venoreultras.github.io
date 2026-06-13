// tests/elementInfo.test.js
// @vitest-environment node
// Phase 11 Plan 11-03 (FUNC-11-08): pure-data module dla edukacyjnego rozszerzonego
// content 15 interactables. Test enforce 15 wpisów × 5 sekcji + Object.freeze.

import { describe, it, expect } from 'vitest';
import { elementInfo } from '../src/data/elementInfo.js';

const EXPECTED_IDS = new Set([
  'kolo-zamachowe',
  'hamulec',
  'wziernik-smarowania',
  'oslona-tylna',
  'kurtyna-lewa',
  'kurtyna-prawa',
  'tabliczka-znamionowa',
  'panel-oburezny',
  'przycisk-start-lewy',
  'przycisk-start-prawy',
  'lampka-gotowosci',
  'estop',
  'oslona-przednia',
  'wylacznik-glowny',
  'dzwignia-sprzegla',
]);

describe('elementInfo — dataset shape (FUNC-11-08)', () => {
  it('eksportuje 15 wpisów', () => {
    expect(Object.keys(elementInfo).length).toBe(15);
  });

  it('wszystkie klucze są w EXPECTED_IDS (15 znanych interactables)', () => {
    for (const key of Object.keys(elementInfo)) {
      expect(EXPECTED_IDS.has(key)).toBe(true);
    }
    for (const id of EXPECTED_IDS) {
      expect(elementInfo[id]).toBeDefined();
    }
  });

  it('każdy wpis ma 5 pól: name, function, parameters, sopSteps, safety', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(entry.name, `${id}.name`).toBeTypeOf('string');
      expect(entry.function, `${id}.function`).toBeTypeOf('string');
      expect(entry.parameters, `${id}.parameters`).toBeTypeOf('string');
      expect(entry.sopSteps, `${id}.sopSteps`).toBeTypeOf('string');
      expect(entry.safety, `${id}.safety`).toBeTypeOf('string');
    }
  });

  it('każde pole ma length > 10 (brak placeholder)', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(entry.name.length, `${id}.name length`).toBeGreaterThan(2);
      expect(entry.function.length, `${id}.function length`).toBeGreaterThan(10);
      expect(entry.parameters.length, `${id}.parameters length`).toBeGreaterThan(10);
      expect(entry.sopSteps.length, `${id}.sopSteps length`).toBeGreaterThan(0);
      expect(entry.safety.length, `${id}.safety length`).toBeGreaterThan(10);
    }
  });

  it('sopSteps niepusty (string z linkami lub "brak")', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(entry.sopSteps.length, `${id}.sopSteps`).toBeGreaterThan(0);
    }
  });

  it('elementInfo jest Object.frozen', () => {
    expect(Object.isFrozen(elementInfo)).toBe(true);
  });
});

describe('elementInfo — Phase 12 extensions (EDU-01/EDU-02)', () => {
  it('każdy wpis ma pole bhp: string', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(entry.bhp, `${id}.bhp`).toBeTypeOf('string');
    }
  });

  it('każde bhp ma length > 20 (brak placeholder)', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(entry.bhp.length, `${id}.bhp length`).toBeGreaterThan(20);
    }
  });

  it('każdy wpis ma pole media: array', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(Array.isArray(entry.media), `${id}.media`).toBe(true);
    }
  });

  it('media jest pustą tablicą w Phase 12 (Phase 16 go wypełni)', () => {
    for (const [id, entry] of Object.entries(elementInfo)) {
      expect(entry.media.length, `${id}.media length`).toBe(0);
    }
  });

  it('elementInfo nadal jest Object.frozen po rozszerzeniu', () => {
    expect(Object.isFrozen(elementInfo)).toBe(true);
  });
});
