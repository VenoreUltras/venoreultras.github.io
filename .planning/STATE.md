---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Rozbudowa edukacyjna i realizm
status: v1.2 COMPLETE — all 6 phases shipped; milestone gate passed (1010 tests, bundle 834.98 KB < 850 KB). Phase 17 code-reviewed (CR-01 blocker fixed).
last_updated: "2026-06-19T22:40:00.000Z"
last_activity: 2026-06-19 -- Phase 17 complete + code-review fixes; v1.2 milestone done, ready for audit
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 18
  completed_plans: 18
  percent: 100
---

# Project State: PM-300 Trener

**Last updated:** 2026-06-19 — Phase 12 (data-foundations) complete

## Project Reference

**Core Value:** Uczeń, który ukończy sesję szkoleniową w symulatorze, wie w jakiej kolejności i dlaczego wykonuje się każdy krok procedury obsługi prasy mimośrodowej — i nie uruchomi maszyny pomijając krytyczny krok bezpieczeństwa.

**Project documents:**

- `.planning/PROJECT.md` — vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — v1.2 requirements (19 total) with phase traceability
- `.planning/ROADMAP.md` — shipped milestones (v1.0, v1.1, Phases 7-11) + active v1.2 (Phases 12-17)
- `.planning/research/v1.2/SUMMARY.md` — synthesis stack/features/architecture/pitfalls v1.2
- `.planning/research/v1.2/ARCHITECTURE.md` — dependency-ordered build sequence + integration points
- `.planning/codebase/` — brownfield codebase map (architecture, structure, conventions, concerns)

**Current focus:** Phase 17 — QuizController + Application Wiring (FINAL phase)

## Current Position

Phase: 17 (quizcontroller-application-wiring) — COMPLETE (4/4 plans); v1.2 milestone gate PASSED
Plan: 17-04 done (QuizController wired into Application ctor + dispose chain; FINAL milestone gate)
Status: Phase 17 executed; 1010 tests green (1 skipped, 0 failed), main bundle 834.98 KB < 850 KB. quizController disposed before examPromptModal; getInteractables().size===15 holds. Deferred: human e2e browser smoke (Task 3, non-blocking).
Last activity: 2026-06-19 -- Phase 17 plan 04 complete (QuizController wiring + v1.2 milestone gate passed)

Progress bar: `[████████████████████] 6 / 6 phases`

⚠ **Open manual checks (deferred):** Phase 15 start-menu visual; Phase 16 media render/404 graceful — validate via `npm run dev`. Media placeholders (kolo-zamachowe, hamulec, tabliczka) are company-owned PNG-as-webp; swap real CC assets at same URLs + update ATTRIBUTION.txt.

**Bundle:** main chunk 834.98 KB / 850 KB (~15 KB headroom) at v1.2 close. quizData + quizSelection ship as a separate cacheable `quiz-data` chunk (26 KB) via Vite `manualChunks` (Phase 13); `assetsInlineLimit:0` (Phase 16) keeps media out of the JS bundle. Headroom is now tight — a future milestone should consider dynamic-import lazy-load of quizData if more main-bundle code lands.

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| v1.2 requirements mapped | 19/19 | 19/19 ✓ |
| Phases planned | 6/6 | 6/6 ✓ |
| Phases complete | 6/6 | 6/6 ✓ |
| Test suite | ≥903 green | 1010/1010 ✓ (1 skipped) |
| Bundle | < 850 KB | 834.98 KB ✓ |
| getInteractables() invariant | === 15 | 15 ✓ |
| FPS target | 60 FPS | maintained from v1.1 |

## Accumulated Context

### Roadmap Shape (v1.2)

6 phases, Phase 12–17. Derived from research 8-step build order with nameplate (isolated) merged into Phase 14 (Overlay) to reduce phase count to standard granularity.

| Phase | Name | Key Deliverable | Requirements |
|-------|------|----------------|--------------|
| 12 | Data Foundations | elementInfo.js bhp+media + quizData.js + quizSelection.js | EDU-01, EDU-02, EDU-03, EXAM-01 |
| 13 | Store Extensions | quiz slice + showStartMenu + finishedAt hybrid branch | MENU-01(prereq), MENU-03, EXAM-02, EXAM-03 |
| 14 | ElementInfoOverlay + Nameplate | atomic panel→overlay swap + tabliczka texture | OVL-01, OVL-02, OVL-03, NAME-01 |
| 15 | StartMenu | StartMenuOverlay, mode cards, localStorage badges | MENU-01, MENU-02, MENU-03 |
| 16 | Media Pipeline | MediaManager + CC assets + ATTRIBUTION.txt gate | MED-01, MED-02, MED-03 |
| 17 | QuizController + Wiring | QuizController + main.js + PDF/JSON + 903+ tests + bundle gate | EXAM-04, TEST-09, TEST-10 |

### Critical Risks (from research)

1. **CRIT-V12-4 (HIGH)** — Atomic swap ElementInfoPanel → ElementInfoOverlay: must preserve `activeModal==='element-info'`, DI signature `{store, lectorService}`, lector button injection, `getInteractables().size===15`; 4 test files need updates; never delete `ElementInfoPanel.js` before replacement is green in all 903 tests
2. **CRIT-V12-1 (HIGH)** — Media nie mogą wejść do bundla JS: wszystkie pliki w `public/media/`, nigdy `import img from './...'`; `assetsInlineLimit: 0` w vite.config.js; bundle check przy każdej fazie dodającej pliki
3. **CRIT-V12-2 (HIGH)** — Licencje CC-BY-NC zabronione (szkolenie wewnętrzne = użycie komercyjne); tylko CC0/CC BY/CC BY-SA/własność firmy; ATTRIBUTION.txt gate zamyka Phase 16
4. **CRIT-V12-5 (MEDIUM)** — Quiz scoring izolowany od procedure scoring: `submitAnswer()` nigdy nie modyfikuje `scoring.score`; PDF/JSON eksport etykietuje oddzielnie
5. **CRIT-V12-3 (MEDIUM)** — YouTube: wyłącznie embed-only (`youtube-nocookie.com`), nigdy download; graceful offline fallback

### Key Architectural Decisions (v1.2)

- `showStartMenu: boolean` — oddzielna flaga od `activeModal`, symulacja nie pauzuje za menu (GSAP ticker działa)
- `dialog.showModal()` — natywny focus-trap dla ElementInfoOverlay i QuizController (nie DIY)
- `quiz` slice całkowicie oddzielony od `scoring` w Zustand store
- Tabliczka: `THREE.TextureLoader` + `colorSpace = THREE.SRGBColorSpace` + `generateMipmaps = false` + POT wymiary (512x256 WebP)
- Media w `public/media/`, referencja przez string URL — Vite nie bundluje `public/`
- fslightbox opcjonalny — overlay oparty o natywny `<dialog>`, fslightbox jako potencjalne ulepszenie
- `ElementInfoPanel.js` usuniemy dopiero gdy `ElementInfoOverlay.js` jest green w 903 testach

### Cross-Cutting Invariants (inherited, must hold throughout v1.2)

- `getInteractables().size === 15` — każda faza weryfikuje ten inwariant
- `npm run build` < 850 KB — gate każdej fazy dodającej pliki
- 903 testy baseline zielone — żaden istniejący test nie może zregresować
- Boundary D-Phase7-05: PressModel importuje tylko THREE, bez DOM/store/training
- Zustand store jest jedynym mutowalnym stanem; `userData` trzyma tylko tożsamość
- Dispose chain: każdy subscriber zwraca unsub; Application.dispose() wired do Vite HMR

### Open Questions (v1.2)

| # | Question | Defer until |
|---|---|---|
| 1 | Wagi combined score: SOP 60% + BHP 40% (lub inna proporcja) — decyzja produktowa | Przed zamknięciem Phase 17 |
| 2 | CC-licensed YouTube videos of eccentric press operation — konkretne URL nie zweryfikowane | Phase 16 content authoring task |
| 3 | Adaptacyjny dobór pytań quizu wg błędów SOP (EX-D1) | v1.3 / po zebraniu danych pilotażowych |
| 4 | EU Machinery Regulation 2023/1230 vs Directive 2006/42/EC — zastosowanie do 2026 | Deployment check; 2006/42/EC applies now |

### Todos / Next Actions

- [ ] Run `/gsd:plan-phase 12` — Data Foundations (elementInfo.js + quizData.js + quizSelection.js)
- [ ] Phase 12: review BHP content accuracy with domain expert before phase close (ISO 16092-1/2 citations)
- [ ] Phase 16: content authoring — verify CC YouTube videos via YouTube Advanced Search → CC filter
- [ ] Phase 17: product decision on combined score weights before PDF/JSON format freeze

### Blockers

None.

## Session Continuity

**Last session ended after:** Roadmap creation for v1.2 (Phases 12–17, 19/19 requirements mapped).

**Files written:**

- `.planning/ROADMAP.md` — v1.2 Active Milestone appended (Phases 12–17); Shipped Milestones preserved
- `.planning/STATE.md` — reset to v1.2 planning state
- `.planning/REQUIREMENTS.md` — Traceability table filled (19/19 requirements → phases)

**Next session should:** `/gsd:plan-phase 12` to decompose Phase 12 into executable plans.

---

*State initialized: 2026-05-05*
*v1.2 roadmap added: 2026-06-13*
