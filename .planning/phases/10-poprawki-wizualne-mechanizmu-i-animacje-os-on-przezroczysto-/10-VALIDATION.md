---
phase: 10
slug: poprawki-wizualne-mechanizmu-i-animacje-os-on-przezroczysto
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source of truth: `10-RESEARCH.md` → `## Validation Architecture`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run --reporter=basic` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=basic` (scoped to touched test files where possible)
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + bundle size budget OK (`npm run build`)
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 10-01-* | 01 | 1 | D-10-01/02 | — | guard transparent + emissive flash still attenuated visible | unit | `npx vitest run tests/PressModel.transparency.test.js` | ❌ W0 | ⬜ pending |
| 10-01-* | 01 | 1 | D-10-03/04 | — | KIN-01 invariant snapshot includes new flange + pin (worldPos x≈0, z≈0 dynamic per angle) | unit | `npx vitest run tests/PressModel.phase7.test.js` | ✅ extend | ⬜ pending |
| 10-01-* | 01 | 1 | D-10-10 | — | lever bracket worldPos.y >= -0.8 - EPSILON anchoring invariant | unit | `npx vitest run tests/PressModel.anchoring.test.js` | ✅ extend | ⬜ pending |
| 10-01-* | 01 | 1 | TWIN-11/12/13 | — | dispose count + size invariant after new mesh additions | unit | `npx vitest run tests/PressModel.smoke.test.js` | ✅ extend | ⬜ pending |
| 10-02-* | 02 | 2 | D-10-06/07/08 | — | InteractionAnimator state machine: click flips pose, isAnimating lock rejects re-entry, timeline-kill on new toggle | unit | `npx vitest run tests/InteractionAnimator.test.js` | ❌ W0 | ⬜ pending |
| 10-02-* | 02 | 2 | D-10-09 | — | RaycastController click channel emits target mesh on tap without drag | unit | `npx vitest run tests/RaycastController.click.test.js` | ❌ W0 | ⬜ pending |
| 10-02-* | 02 | 2 | boundary | — | InteractionAnimator imports only THREE+gsap (no state/training/DOM/ui) | unit | `npx vitest run tests/boundaries.test.js` | ✅ extend | ⬜ pending |
| 10-03-* | 03 | 3 | wiring | — | Application constructs animator after Raycast, dispose order animator→raycast→emissive | integration | `npx vitest run tests/Application.lifecycle.test.js` (if exists) or smoke | ⚠ manual fallback | ⬜ pending |
| 10-03-* | 03 | 3 | smoke | — | `npm run dev` — klik osłony tweenuje closed↔open; klik dźwigni tweenuje released↔engaged; mechanizm widoczny przez przezroczystą osłonę; flash hover/state widoczny na guardzie | manual | `npm run dev` + checklist | manual | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/PressModel.transparency.test.js` — D-10-01/02 stubs (`matGuardOrange.transparent === true`, `opacity === 0.5`; EmissiveController flash still mutates `emissiveIntensity` on transparent material)
- [ ] `tests/InteractionAnimator.test.js` — animator state machine stubs (toggle, isAnimating lock, timeline-kill, pivotTarget='parent' rotates parent)
- [ ] `tests/RaycastController.click.test.js` — click channel stubs (down+up without drag emits target; drag > threshold does NOT emit click)
- [ ] Extend `tests/PressModel.phase7.test.js` (KIN-01) snapshot list: new flange (`shaft-eccentric-flange`) + new pin (`eccentric-rod-pin`)
- [ ] Extend `tests/PressModel.anchoring.test.js` — lever bracket worldPos.y invariant
- [ ] Extend `tests/PressModel.smoke.test.js` — TWIN size + dispose count after new mesh additions
- [ ] Extend `tests/boundaries.test.js` — new entry for `src/InteractionAnimator.js` (THREE+gsap only)

*Wave 0 = test scaffolds created before implementation tasks; Wave 1+ fills them in.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Półprzezroczysta osłona nie zabija czytelności emissive flasha (Wong palette) | D-10-02 | Wymaga ludzkiej oceny perceptual contrast | `npm run dev` → hover osłony przedniej → flash widoczny (zażółcenie); jeśli niewidoczny — zwiększyć emissiveIntensity albo zmniejszyć opacity do 0.4 |
| Łączniki wał↔mimośród + mimośród↔korbowód wyglądają jak realne mechaniczne połączenia (bez gap / Z-fighting) | D-10-04 | Wizualna spójność | `npm run dev` → orbituj kamerą wokół wału przy obracającym się mechanizmie; brak prześwitów między cylindrami |
| Wspornik dźwigni wyrasta z obudowy w sposób wiarygodny (nie wisi w powietrzu) | D-10-10 | Wizualna spójność | `npm run dev` → orbituj kamerą wokół dźwigni; wspornik łączy ramę (~x=-2) z podstawą dźwigni (-3,7,0.5) |
| Bearings (D-10-05) — decyzja "czy zwiększać R" | D-10-05 | Claude's discretion gate | `npm run dev` → ocena czy łożyska wyglądają mizernie; jeśli tak — bump R 0.6→0.7-0.8 lub kontrastowy kołnierz |
| Animacja klik 0.4s power2.inOut "czuje się dobrze" (nie za szybka, nie za wolna) | D-10-06 | Subjective UX | `npm run dev` → klik osłony i dźwigni; brak jitter, brak kolejki przy spam-klik |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies (animator state machine, click channel, transparency, KIN-01 extension, anchoring extension, smoke extension, boundaries extension)
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (3 new test files + 4 extensions)
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
