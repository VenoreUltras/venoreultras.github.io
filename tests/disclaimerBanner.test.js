// tests/disclaimerBanner.test.js
// @vitest-environment jsdom
// UI-05: DisclaimerBanner mount + toggle + persistence + dispose.

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { DisclaimerBanner } from '../src/DisclaimerBanner.js';
import { pl } from '../src/i18n/pl.js';

const STORAGE_KEY = 'pm300:disclaimer:collapsed:v1';

describe('DisclaimerBanner — mount (UI-05)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('wstrzykuje element do document.body jako pierwsze dziecko', () => {
    new DisclaimerBanner();
    const el = document.getElementById('disclaimer-banner');
    expect(el).not.toBeNull();
    expect(document.body.firstChild).toBe(el);
  });

  it('idempotent insert — drugi new DisclaimerBanner() nie tworzy duplikatu', () => {
    new DisclaimerBanner();
    new DisclaimerBanner();
    const all = document.querySelectorAll('#disclaimer-banner');
    expect(all).toHaveLength(1);
  });

  it('content używa textContent (XSS-safe) z pl.disclaimer.full', () => {
    new DisclaimerBanner();
    const content = document.getElementById('disclaimer-banner__content');
    expect(content.textContent).toBe(pl.disclaimer.full);
  });

  it('ARIA: role=region + aria-label = "Zastrzeżenie symulatora"', () => {
    new DisclaimerBanner();
    const root = document.getElementById('disclaimer-banner');
    expect(root.getAttribute('role')).toBe('region');
    expect(root.getAttribute('aria-label')).toBe(pl.disclaimer.ariaLabel);
  });

  it('default state: expanded (aria-expanded=true, brak collapsed class)', () => {
    new DisclaimerBanner();
    const btn = document.querySelector('.disclaimer-banner__toggle');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('disclaimer-banner').classList.contains('disclaimer-banner--collapsed')).toBe(false);
  });
});

describe('DisclaimerBanner — persistence (D-12)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('localStorage "true" → mount jako collapsed', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    new DisclaimerBanner();
    const btn = document.querySelector('.disclaimer-banner__toggle');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('disclaimer-banner').classList.contains('disclaimer-banner--collapsed')).toBe(true);
  });

  it('localStorage "false" → mount jako expanded', () => {
    localStorage.setItem(STORAGE_KEY, 'false');
    new DisclaimerBanner();
    const btn = document.querySelector('.disclaimer-banner__toggle');
    expect(btn.getAttribute('aria-expanded')).toBe('true');
  });

  it('toggle expanded → collapsed zapisuje "true" do localStorage', () => {
    new DisclaimerBanner();
    const btn = document.querySelector('.disclaimer-banner__toggle');
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('toggle collapsed → expanded zapisuje "false"', () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    new DisclaimerBanner();
    const btn = document.querySelector('.disclaimer-banner__toggle');
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('false');
  });

  it('aria-label zmienia się przy toggle (toggleExpand <-> toggleCollapse)', () => {
    new DisclaimerBanner();
    const btn = document.querySelector('.disclaimer-banner__toggle');
    expect(btn.getAttribute('aria-label')).toBe(pl.disclaimer.toggleCollapse);
    btn.click();
    expect(btn.getAttribute('aria-label')).toBe(pl.disclaimer.toggleExpand);
  });

  it('collapsed state ma title attribute z pelnym disclaimer (progressive enhancement)', () => {
    new DisclaimerBanner();
    const btn = document.querySelector('.disclaimer-banner__toggle');
    btn.click(); // collapse
    expect(btn.getAttribute('title')).toBe(pl.disclaimer.full);
  });
});

describe('DisclaimerBanner — defensive (private mode localStorage)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('NIE crashuje gdy localStorage.setItem rzuca', () => {
    const origSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('quota'); };
    try {
      new DisclaimerBanner();
      const btn = document.querySelector('.disclaimer-banner__toggle');
      expect(() => btn.click()).not.toThrow();
    } finally {
      Storage.prototype.setItem = origSet;
    }
  });

  it('NIE crashuje gdy localStorage.getItem rzuca → default expanded', () => {
    const origGet = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('access denied'); };
    try {
      new DisclaimerBanner();
      const btn = document.querySelector('.disclaimer-banner__toggle');
      expect(btn.getAttribute('aria-expanded')).toBe('true');
    } finally {
      Storage.prototype.getItem = origGet;
    }
  });
});

describe('DisclaimerBanner — dispose (STATE-03)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('dispose() removeEventListener — kolejne klik nie zmienia stanu', () => {
    const banner = new DisclaimerBanner();
    const btn = document.querySelector('.disclaimer-banner__toggle');
    banner.dispose();
    const before = btn.getAttribute('aria-expanded');
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe(before);
  });
});

describe('DisclaimerBanner — D-13 code-fence comment', () => {
  it('plik zrodlowy zawiera komentarz dokumentujacy D-13 interpretacje', () => {
    const src = readFileSync('src/DisclaimerBanner.js', 'utf-8');
    expect(src).toMatch(/D-13/i);
    expect(src).toMatch(/widoczny stale|dismiss/i);
  });
});
