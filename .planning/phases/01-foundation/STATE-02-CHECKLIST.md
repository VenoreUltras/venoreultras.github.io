# STATE-02 Code Review Checklist

**Invariant:** `mesh.userData` przechowuje WYŁĄCZNIE identity (np. `meshId: 'oslona-przednia'`).
Status (open/closed, hover, active) NIGDY nie żyje w `userData` — zawsze w `TrainingStore.meshStates[meshId]`.

**Phase 1 status:** No-op — Phase 1 NIE tworzy nowych meshy; istniejące geometry w `PressModel.buildPress()`
to anonymous primitives bez `userData`. Invariant zacznie być egzekwowany w Phase 2 gdy digital twin
expansion doda interactable meshes z `userData = { meshId }`.

## Review checklist (egzekwowane od Phase 2)

Przy każdym PR dotykającym `PressModel.js` / nowych meshy w scenie:

- [ ] `userData` zawiera tylko `meshId` (string, stable identifier zgodny z `i18n/pl.js` registry).
- [ ] `userData` NIE zawiera: `state`, `isOpen`, `hovered`, `selected`, `active`, ani innego pola statusu.
- [ ] Status meshu czytany przez subscriber `store.subscribe(s => s.meshStates[meshId])`.
- [ ] Reakcja na status (color/material swap) wywoływana z subscribera, nie z `userData` mutacji.

## Egzekwowanie automatyczne

Plan 05 (Phase 1) doda `tests/boundaries.test.js` z assertion: żaden plik w `src/` nie zawiera literału
`userData.state` ani `userData.isOpen`. Phase 2 plan dorzuci dodatkowe gates dla meshy interaktywnych.
