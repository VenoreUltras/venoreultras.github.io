# Project State: PM-300 Trener

**Last updated:** 2026-05-05 after Phase 1 context gathering

## Project Reference

**Core Value:** Uczeń, który ukończy sesję szkoleniową w symulatorze, wie w jakiej kolejności i dlaczego wykonuje się każdy krok procedury obsługi prasy mimośrodowej — i nie uruchomi maszyny pomijając krytyczny krok bezpieczeństwa.

**Project documents:**
- `.planning/PROJECT.md` — vision, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 64 v1 requirements with phase traceability
- `.planning/ROADMAP.md` — 6 v1 phases + Phase 7 v2 frontier
- `.planning/research/SUMMARY.md` — synthesis of stack/features/architecture/pitfalls research
- `.planning/codebase/` — brownfield codebase map (architecture, structure, conventions, concerns)

**Current focus:** Phase 1 — Foundation. Context gathered (`.planning/phases/01-foundation/01-CONTEXT.md`); ready for `/gsd-plan-phase 1`.

## Current Position

| Field | Value |
|-------|-------|
| Milestone | v1 — SOP Training Layer |
| Phase | 1 — Foundation |
| Plan | (not yet planned — run `/gsd-plan-phase 1`) |
| Status | Phase 1 context gathered (16 decisions across 4 gray areas); awaiting plan decomposition |
| Mode | YOLO with parallel execution |
| Granularity | Standard |

**Progress:**

```
Phase 1: Foundation                          [          ] 0%   not started
Phase 2: Digital Twin Geometry               [          ] 0%   not started
Phase 3: Click-to-State Pipeline             [          ] 0%   not started
Phase 4: Visual Feedback Layer               [          ] 0%   not started
Phase 5: Educational Layer                   [          ] 0%   not started
Phase 6: Scenarios + Replay + Retry + Export [          ] 0%   not started
Phase 7: (v2) Differentiators                [    v2    ] —    deferred
```

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| v1 requirements mapped | 64/64 | 64/64 ✓ |
| Phases planned | 6/6 | 0/6 |
| Phases complete | 6/6 | 0/6 |
| ProcedureEngine test coverage | ≥95% | n/a (Phase 1) |
| FPS target on integrated graphics | 60 | n/a (existing demo holds it; new layers must preserve it) |

## Accumulated Context

### Key Decisions (from PROJECT.md)

- **Pełny digital twin** — every SOP-relevant component clickable in 3D (Phase 2)
- **Zustand vanilla** as central store (Phase 1)
- **Hybrid interaction** — 3D clicks for manipulation steps, checkboxes for visual-inspection steps (Phase 3)
- **Vitest** as test framework (Phase 1)
- **Local scoring + JSON/PDF export** — no backend (Phase 6)
- **Full SOP scope v1** — all four scenarios (uruchomienie, cykl pracy, zatrzymanie, awaria); first scenario lands in Phase 1, the other three in Phase 6
- **Polish only in v1** — `src/i18n/pl.js` table, no i18n libraries

### Cross-Cutting Architectural Invariants (must hold across all phases)

- Disclaimer banner present from Phase 1; PDF/JSON export framed as "Raport sesji szkoleniowej", never "Certyfikat" (CRIT-1, AF-9)
- Stable string ids for steps/scenarios/meshes; numeric indices are render-only (CRIT-2, CRIT-3)
- Color + icon + text encoding (Wong palette: #D55E00 error / #009E73 success); high-contrast outline toggle available (CRIT-4)
- Raycast only on `pointermove`/`pointerdown`, throttled to 1 per tick (CRIT-5)
- Per-interactable cloned `MeshStandardMaterial` + dispose registry (CRIT-6)
- Zustand store is the only mutable status; `userData` holds identity only (CRIT-7)
- Synchronous validator + `isAnimating` lock + idempotent step ids (CRIT-8)
- Every subscriber returns unsubscribe; `Application.dispose()` wired to Vite HMR (MOD-1)
- One-way data flow store → scene; no scene-to-store writes outside user-action handlers

### Open Questions (deferred decisions)

| # | Question | Defer until |
|---|---|---|
| 1 | Final Polish-jurisdiction disclaimer copy (BHP-officer review) | Before production deploy; placeholder copy used in Phase 1 |
| 2 | TTF choice for PDF — Roboto / Noto Sans / DejaVu Sans | Phase 6 kickoff |
| 3 | Default for "honest mode" retry locking in Egzamin | Phase 6 (stakeholder, not technical) |
| 4 | Replay fidelity — snapshot every 100ms vs deterministic event-log replay | Phase 6 |
| 5 | Audio assets — synthesize via WebAudio vs ship samples | Phase 5 kickoff (synthesis recommended) |
| 6 | Final scoring weights (-25 critical / -10 medium / -2 minor) | Domain-expert review before Phase 6 export-format freeze |
| 7 | Interactable mesh count after digital-twin expansion (~30 estimated) | Phase 2 — if profile shows >50 with hover raycasting, revisit `three-mesh-bvh` decision |

### Todos / Next Actions

- [ ] Run `/gsd-plan-phase 1` to decompose Phase 1 into plans
- [ ] Begin Phase 1 implementation when plan is approved
- [ ] (W trakcie Phase 1) edytować `REQUIREMENTS.md` UI-02 i `ROADMAP.md` Phase 4 SC3 — dodać 7. stan maszyny `Rozpędzanie...` (decyzja D-09 z 01-CONTEXT.md)

### Blockers

None.

## Session Continuity

**Last session ended after:** Phase 1 context gathering (`/gsd-discuss-phase 1`). Files written:
- `.planning/phases/01-foundation/01-CONTEXT.md` (16 decisions: schemat scenariusza JSON, lista 8 kroków `uruchomienie`, disclaimer banner, formuła scoringu)
- `.planning/phases/01-foundation/01-DISCUSSION-LOG.md` (audit trail)
- `.planning/STATE.md` (this file)

**Next session should:** Run `/gsd-plan-phase 1` to decompose Phase 1 (Foundation) into concrete plans on top of the locked context, then execute under YOLO + parallel mode.

---

*State initialized: 2026-05-05*
