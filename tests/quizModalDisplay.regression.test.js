// tests/quizModalDisplay.regression.test.js
// Phase 20 (TEST-11): regresja bugu wykrytego w UAT fazy 19.
//
// BUG: `.modal-card--bhp-quiz { display: flex }` (styl autora) nadpisywał wbudowaną
// regułę przeglądarki `dialog:not([open]) { display: none }` (UA stylesheet ma NIŻSZY
// priorytet origin niż autor — niezależnie od specyficzności). Efekt: dialog quizu BHP
// był renderowany ZAWSZE — od startu aplikacji — i jako pełnoekranowy modal blokował
// menu startowe oraz przełączanie trybów.
//
// FIX: reguła display dla wariantu jest bramkowana selektorem [open]
// (`.modal-card--bhp-quiz[open] { display: flex }`). Gdy dialog zamknięty (brak [open]),
// UA `dialog:not([open])` ukrywa go poprawnie. showModal()/fallback jsdom ustawiają [open].
//
// jsdom NIE aplikuje UA stylesheet ani layoutu, więc nie da się tego złapać przez
// computed-style — guard czyta źródło style.css i wymusza bramkowanie na [open].

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS = readFileSync(fileURLToPath(new URL('../style.css', import.meta.url)), 'utf-8');

describe('regresja: modal quizu BHP ukryty gdy zamknięty (UAT faza 19)', () => {
  it('reguła display dla .modal-card--bhp-quiz jest bramkowana selektorem [open]', () => {
    // Znajdź każdy blok CSS, którego selektor zawiera .modal-card--bhp-quiz i który
    // ustawia własność display. Każdy taki blok MUSI mieć [open] w selektorze.
    const blockRe = /([^{}]*\.modal-card--bhp-quiz[^{}]*)\{([^}]*)\}/g;
    let m;
    let foundDisplayBlock = false;
    while ((m = blockRe.exec(CSS)) !== null) {
      const selector = m[1];
      const body = m[2];
      if (/\bdisplay\s*:/.test(body)) {
        foundDisplayBlock = true;
        expect(
          selector.includes('[open]'),
          `Blok CSS ustawiający display dla bhp-quiz musi być bramkowany [open], inaczej dialog pokazuje się zawsze. Selektor: "${selector.trim()}"`,
        ).toBe(true);
      }
    }
    // Sanity: upewnij się, że w ogóle istnieje reguła display dla wariantu (inaczej test
    // byłby fałszywie zielony, gdyby ktoś usunął cały blok i wprowadził inny regres).
    expect(foundDisplayBlock).toBe(true);
  });

  it('NIE istnieje bare blok ".modal-card--bhp-quiz {" ustawiający display bez [open]', () => {
    // Bezpośredni guard na konkretny kształt buga: bare selektor wariantu (bez [open],
    // bez deskendenta) z display.
    const bareRe = /\.modal-card--bhp-quiz\s*\{([^}]*)\}/g;
    let m;
    while ((m = bareRe.exec(CSS)) !== null) {
      expect(
        /\bdisplay\s*:/.test(m[1]),
        'Bare ".modal-card--bhp-quiz { ... display ... }" reintrodukuje bug — użyj [open].',
      ).toBe(false);
    }
  });
});
