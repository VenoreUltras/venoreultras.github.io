---
phase: 15-startmenu
reviewed: 2026-06-19T00:00:00Z
depth: deep
files_reviewed: 8
files_reviewed_list:
  - src/ui/StartMenuOverlay.js
  - src/main.js
  - src/ui/StatusPanel.js
  - index.html
  - src/i18n/pl.js
  - tests/StartMenuOverlay.test.js
  - tests/application.test.js
  - tests/boundaries.test.js
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: findings
---

# Phase 15: Code Review Report

**Reviewed:** 2026-06-19
**Depth:** deep
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Phase 15 wires a store-driven StartMenuOverlay (3 mode cards + last-session indicators), a first-launch bootstrap, a second `finishedAt` subscriber persisting `pm300:last-session:<mode>:v1`, and a StatusPanel "Zmień tryb" button. The architecture is sound and the high-value invariants the workflow flagged all check out:

- **MENU-03 (sim runs under menu): PASS.** `simulationTick` (src/main.js:418) pauses integration only on `activeModal !== null`; `showStartMenu` is never read by the tick. The new application.test.js MENU-03 test pins this.
- **Bootstrap ORDER: PASS.** `setState({ showStartMenu: true })` (src/main.js:143) runs before `new StartMenuOverlay(...)` (src/main.js:388). Constructor `_render()` reads correct visibility.
- **finishedAt subscriber additive: PASS.** The MENU-02 subscriber (src/main.js:251) is pushed independently; the existing `savePersistedSession` subscriber (src/main.js:229) is untouched. `subscribeWithSelector` supports multiple listeners per selector.
- **dispose / no leak: PASS.** MENU-02 subscriber is in `_unsubscribers` (cleared src/main.js:476). StartMenuOverlay.dispose() removes card + start-button listeners, calls all unsubs, removes container, idempotent. StatusPanel "Zmień tryb" listener removal is symmetric (src/ui/StatusPanel.js:329).
- **XSS: PASS.** All dynamic content (card titles/desc, score, date from localStorage) goes through `textContent`. The single `innerHTML` use is a static literal skeleton with no interpolation (src/ui/StartMenuOverlay.js:63).

Remaining issues are robustness/UX/correctness-at-the-edges, none blocking.

## Warnings

### WR-01: Structurally-valid-but-wrong-shape last-session JSON renders "undefined/100 pkt, undefined"

**File:** `src/ui/StartMenuOverlay.js:184-194`
**Issue:** `_renderLastSession` parses the stored JSON and destructures `{ score, date }`, then interpolates them unconditionally. The try/catch only guards against *unparseable* JSON. If `pm300:last-session:<mode>:v1` holds valid JSON of the wrong shape — e.g. `"42"`, `"{}"`, an object missing `score`/`date`, or a partially-written value from an interrupted quota-failed write — `JSON.parse` succeeds and `score`/`date` are `undefined`. The card then shows literally `Ostatnia sesja: undefined/100 pkt, undefined`. Verified: `JSON.parse("42")` → 42 → `${score}/100, ${date}` → `"undefined/100, undefined"`. This violates the stated MENU requirement "no crash, no indicator" — there is no crash, but a broken indicator is shown. (Note: `JSON.parse("null")` does throw on destructure and is caught, but numbers/objects/missing-keys do not.)
**Fix:**
```js
const parsed = JSON.parse(raw);
const score = parsed?.score;
const date = parsed?.date;
if (typeof score !== 'number' || typeof date !== 'string') return null; // wrong shape → graceful absence
return `${pl.startMenu.lastSessionPrefix}${score}/100 ${pl.startMenu.lastSessionPts}, ${date}`;
```

### WR-02: Mode cards are keyboard-focusable but not keyboard-operable (a11y)

**File:** `src/ui/StartMenuOverlay.js:83-101`
**Issue:** Each card is given `role="button"` and `tabindex="0"`, signalling to assistive tech and keyboard users that it is an actionable control. Only a `click` listener is attached — there is no `keydown` handler for Enter/Space. A keyboard-only or screen-reader user can Tab to a card and receive focus, but pressing Enter/Space does nothing, so they cannot select a mode and are locked out of starting a session via keyboard. (The "Rozpocznij" button is a real `<button>` and works, but it is a no-op until a card is selected.)
**Fix:** Add a keydown handler on each card (store the bound ref for symmetric removeEventListener in dispose):
```js
const onKeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._selectCard(mode); }
};
card.addEventListener('keydown', onKeydown);
this._cardEls.set(mode, { card, onClick, onKeydown });
// dispose(): card.removeEventListener('keydown', onKeydown);
```

### WR-03: Last-session date uses UTC, causing off-by-one day near midnight

**File:** `src/main.js:258`
**Issue:** `new Date(finishedAt).toISOString().slice(0, 10)` formats the date in **UTC**, but the indicator is presented to a local user. `finishedAt` is `Date.now()` (epoch ms). A session finished at e.g. 23:30 local time in UTC+2 is stored as the *previous* UTC day; finishing just after midnight local in a negative offset shows the *next* day. The displayed "Ostatnia sesja … YYYY-MM-DD" can be off by one day relative to the user's calendar. The same value is later read verbatim and shown by `_renderLastSession`.
**Fix:** Format in local time, e.g.:
```js
const d = new Date(finishedAt);
const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
```

## Info

### IN-01: Stale selection persists when menu is re-opened via "Zmień tryb"

**File:** `src/ui/StartMenuOverlay.js:118-139, 156-161`
**Issue:** After the user starts a session, the overlay is hidden (not disposed). `_selectedMode` and the `start-menu__card--selected` CSS class are never cleared. When the user later re-opens the menu via StatusPanel "Zmień tryb" (`showMenu()` → `showStartMenu=true` → `_render`), the previously chosen card is still highlighted and `_selectedMode` is still set, so a single click on "Rozpocznij" immediately re-commits the old mode without the user actively re-choosing. Not a correctness bug (the mode is a valid prior choice), but a confusing UX state on re-entry.
**Fix:** In `_render()` when transitioning to visible (or in a `showMenu`-triggered path), reset selection: clear `this._selectedMode = null` and toggle off all `--selected` classes so the user must re-select.

### IN-02: 'free' mode last-session indicator records SOP score, not a meaningful "session" result

**File:** `src/main.js:255-261`
**Issue:** The MENU-02 subscriber fires for every `finishedAt` null→ts transition regardless of mode and writes `scoring.score` for the current mode key, including `free`. In 'free' (exploration, no grading) and 'egzamin' (where the meaningful result is the post-SOP `quiz.score`, written separately), the persisted `scoring.score` may not represent what a user expects the card's "Ostatnia sesja" to mean. This matches the current spec (one path, `scoring.score`, per mode) so it is informational, but worth confirming with the Phase 17 quiz-results design so the egzamin card does not show the SOP score while the user remembers their quiz score.
**Fix:** None required for Phase 15 — flag for Phase 17 coordination. If the egzamin card should reflect the quiz, gate the write on mode and source the value from `quiz.score` for egzamin.

---

_Reviewed: 2026-06-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
