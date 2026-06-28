# Research Summary — PM-300 Trener v1.2

**Project:** PM-300 Trener — Rozbudowa edukacyjna i realizm
**Domain:** Browser-based industrial press training simulator (client-side SPA, no backend)
**Researched:** 2026-06-13
**Confidence:** HIGH

---

## Executive Summary

PM-300 Trener v1.2 adds six educational expansion features on top of the shipped v1.1 base: a start menu with mode selection, a full-screen lightbox overlay replacing the cramped ElementInfoPanel, detailed BHP/operation instructions per element grounded in ISO 16092, real CC-licensed photos and videos, a realistic 3D nameplate texture, and a hybrid exam combining SOP interaction with BHP knowledge-check questions. The entire milestone is achievable with a single new npm dependency — `fslightbox` (~12 KB gzip) — because every other feature uses the frozen stack (Three.js r184, GSAP ~3.15, Zustand ~5, Vite ~8, Vitest ~4, jspdf, @floating-ui/dom) plus zero-cost browser platform APIs. The current JS bundle sits at 809.94 KB against a hard 850 KB ceiling; the projected post-v1.2 total is ~822 KB, leaving ~28 KB of headroom for code growth across new UI classes.

The recommended build order follows a strict data-first dependency graph: author `elementInfo.js` extensions and `quizData.js` first (pure data, no deps), extend the Zustand `trainingStore` with a quiz slice and `showStartMenu` flag next, then build the ElementInfoOverlay and StartMenuOverlay in parallel (both pure store consumers), followed by MediaManager and asset pipeline, then nameplate texture, then QuizController, and finally wire everything into `src/main.js`. This order ensures every component has its data contract established before it is built and keeps every increment independently testable.

The highest regression risk in the entire milestone is the atomic swap of `ElementInfoPanel` for `ElementInfoOverlay`. That panel is the current handler for `activeModal === 'element-info'` and is wired into `Application`, `RaycastController`, `LectorService`, and five test files. The replacement must preserve the same store key, the same constructor DI signature, the same lector button injection point, and must not alter `getInteractables() === 15`. Media licensing is the second critical risk: CC-BY-NC photos are prohibited for internal corporate training (they constitute commercial use under CC FAQ), every asset needs an entry in `public/media/ATTRIBUTION.txt` before the phase closes, and YouTube videos must be embedded-only (never downloaded).

---

## Key Findings

### Recommended Stack

The frozen stack handles all v1.2 requirements without modification. The one justified new dependency is `fslightbox` 3.4.1 (MIT, free/basic tier, ~12 KB gzip), chosen over DIY because writing a correct accessible focus trap + keyboard handler + close-on-Escape + backdrop for a full-screen overlay costs ~300 lines of tested code with higher bug risk, and over GLightbox because fslightbox handles YouTube iframes with less configuration. All other additions — quiz state machine, start menu, media manager, nameplate texture — use Zustand vanilla stores, vanilla DOM class patterns already present in the codebase, and `THREE.TextureLoader` which is built into the frozen Three.js install.

Media hosting strategy is the critical non-code decision: all photos and videos go into `public/media/` and `public/textures/`, referenced by string URL, never imported in JS. Vite's bundler is completely bypassed for files in `public/`; they are copied verbatim to `dist/`. A single inadvertent `import nameplate from './assets/nameplate.jpg'` would consume the entire 40 KB remaining headroom.

**Core technologies:**
- `fslightbox` 3.4.1: full-screen overlay for images, HTML5 video, and YouTube iframes — the single new production dependency, ~12 KB gzip, fits in headroom
- `THREE.TextureLoader` (built-in r184): nameplate photo texture loading — `texture.colorSpace = THREE.SRGBColorSpace` is mandatory for correct PBR color
- `<iframe youtube-nocookie.com>`: instructional video embedding — pure HTML, no JS lib, zero bundle cost, YouTube CDN handles all bytes
- Zustand vanilla store (frozen ^5.0.13): quiz state slice + `showStartMenu` flag — already installed, zero additional bundle
- `public/media/` static hosting: WebP photos (512x512 or smaller, POT dimensions), H.264 MP4 for short clips

**Bundle budget projection:**

| Item | Gzip delta |
|------|-----------|
| Current bundle | 809.94 KB |
| fslightbox basic | +~12 KB |
| All other additions | +0 KB |
| Projected total | ~822 KB |
| Hard limit | 850 KB |
| Remaining headroom | ~28 KB |

### Expected Features

All six feature areas have well-defined table-stakes baselines and optional differentiators. The MVP for v1.2 GA consists of SM-1/2/3 (start screen with mode cards and session resume), OV-1/2 (lightbox with Budowa/BHP/Instrukcja tabs), BHP-1 content for the 5 most safety-critical elements, NP-1 (nameplate texture — synthetic SVG-based is acceptable for launch), and EX-1/2/3 (hybrid exam for the Uruchomienie scenario).

**Must have (v1.2 table stakes):**
- SM-1: Start/welcome screen with mode cards (Swobodny / Nauka / Egzamin) — every serious training tool gates entry with mode selection
- OV-1: Full-screen lightbox overlay replacing ElementInfoPanel — cannot hold real photos, video, and tabbed content in a side panel
- OV-2: Overlay tabs Budowa / BHP / Instrukcja — information architecture for multi-topic content
- BHP-1: BHP content per element covering ISO 16092-2 Groups A-G (guards, two-hand control, E-stop, flywheel energy, clutch/brake, LOTO, pre-start inspection)
- NP-1: Realistic nameplate texture on 3D mesh — CE-compliant fields per 2006/42/EC Annex I §1.7.3
- EX-1/2/3: Hybrid exam with BHP knowledge-check questions, scenario-based question types (50% MC, 30% T/F, 20% sequence), immediate per-question corrective feedback, 80% pass threshold

**Should have (differentiators, post-pilot):**
- SM-2: Session resume indicator per mode ("Ostatnia sesja: 85/100 pkt, 2026-06-12")
- OV-3: Step-synced auto-open in Nauka mode for just-in-time instruction
- OV-D2: Embedded real video clips (CC-licensed YouTube or self-hosted MP4) in overlay
- EX-D1: Adaptive quiz question selection biased toward topics the trainee missed during SOP

**Defer to v1.3 / v2:**
- OV-D1: Annotated SVG callouts on overlay photos — high content authoring cost
- SM-D1: Scenario progress map on start screen
- EX-D1 adaptive selection — needs error-log data from real usage to be useful

**Anti-features (never build):**
- Auto-generated "BHP certificate" implying legal validity — Polish BHP certification requires certified instructor delivery
- Mandatory overlay viewing before each step — violates adult-learning autonomy; exam mode unworkable
- Generic stock-photo presses (hydraulic, injection-moulding) — breaks digital-twin fidelity contract

### Architecture Approach

The six v1.2 additions slot cleanly into the existing four-class no-framework architecture. No new routing, no framework, no significant structural change. New components follow the established DOM panel pattern: vanilla class, constructor DI for store and services, subscribe + dispose, no Three.js or GSAP inside UI classes. The keystone addition is `ElementInfoOverlay` replacing `ElementInfoPanel` — same store contract (`activeModal === 'element-info'`), same DI signature, same lector injection point, upgraded to `dialog.showModal()` for proper focus trapping. `StartMenuOverlay` uses a separate `showStartMenu: boolean` store flag (not `activeModal`) to avoid pausing the GSAP ticker behind the start screen. Quiz state lives in an isolated `quiz` Zustand slice separate from the existing `scoring.procedure` fields to prevent scoring conflation.

**Major new components:**
1. `src/ui/StartMenuOverlay.js` — subscribes to `store.showStartMenu`; renders mode cards; on confirm calls `setMode()` + `hideMenu()`; no Three.js, no GSAP
2. `src/ui/ElementInfoOverlay.js` — replaces `ElementInfoPanel`; handles `activeModal === 'element-info'`; `dialog.showModal()`; renders `bhp` + `media` fields from extended `elementInfo.js`; preserves lector DI
3. `src/media/MediaManager.js` — lazy image preload + HEAD validation; pure DOM; no store; injected into ElementInfoOverlay
4. `src/ui/QuizController.js` — handles `activeModal === 'bhp-quiz'`; renders questions from `src/data/quizData.js`; calls `submitAnswer()` / `finishQuiz()` on store quiz slice
5. `src/data/quizData.js` — pure data module, zero imports, parallel to `elementInfo.js`
6. `src/training/quizSelection.js` — pure function `selectQuizQuestions(scenarioId)`, importable from store and tests

**Modified components:**
- `src/data/elementInfo.js`: add `bhp: string` and `media: MediaRef[]` fields to all 15 entries (backward-compatible; consumers check `entry.media?.length`)
- `src/state/trainingStore.js`: add `showStartMenu`, `quiz` slice, `startQuiz/submitAnswer/finishQuiz` actions; modify `finishedAt` subscriber to branch into quiz phase before `endExam()`
- `src/PressModel.js`: `_buildNameplate()` swap CanvasTexture -> `THREE.TextureLoader` + WebP; `colorSpace = SRGBColorSpace`; `generateMipmaps = false`; `trackTexture()` via MaterialRegistry
- `src/main.js`: swap `ElementInfoPanel` -> `ElementInfoOverlay`; add `MediaManager`, `StartMenuOverlay`, `QuizController`; update dispose chain order

**Deleted:** `src/ui/ElementInfoPanel.js` — replaced by `ElementInfoOverlay` (delete only after replacement is green in all 903 tests)

### Critical Pitfalls

1. **Media imported into JS blows the bundle limit (CRIT-V12-1)** — place all photos, videos, and textures in `public/media/` and reference by string URL only; never use `import` statements for media files; add `assetsInlineLimit: 0` to `vite.config.js`; run `npm run build` with a bundle-size assertion as an acceptance criterion for every phase that adds assets

2. **CC-BY-NC photo licensing for internal training (CRIT-V12-2)** — internal corporate training is "commercial use" under CC FAQ; only CC0, CC BY, CC BY-SA, or employer-owned photos are safe; every asset must have an entry in `public/media/ATTRIBUTION.txt` with filename, author, source URL, and license before the phase closes; for the nameplate, use a synthetic SVG-designed texture (no CC photo of PM-300 nameplate exists)

3. **ElementInfoPanel removal breaks the nauka/free click flow (CRIT-V12-4)** — preserve `activeModal === 'element-info'` as the unchanged store key; maintain the identical constructor DI signature `{store, lectorService}`; update exactly 4 test files (`ElementInfoPanel.test.js`, `boundaries.test.js`, `phase11.integration.test.js`, `RaycastController.test.js`); never delete `ElementInfoPanel.js` before replacement is green in all 903 tests; verify `getInteractables().size === 15` passes throughout

4. **Quiz scoring conflated with procedure scoring (CRIT-V12-5)** — the `quiz` Zustand slice is entirely separate from the existing `scoring` object; `submitQuizAnswer()` never touches `scoring.score`; PDF/JSON export labels them separately ("Wynik proceduryczny: X/Y kroków" and "Wynik BHP: A/B pytań"); no existing test should fail after adding quiz scoring

5. **YouTube video downloaded and self-hosted (CRIT-V12-3)** — YouTube ToS explicitly prohibits downloading; embed-only via `<iframe src="https://www.youtube-nocookie.com/embed/{id}">`; treat embedded video as "optional enhancement" with graceful fallback (text + still photo renders without network); for mandatory training content, obtain CC0/CC-BY or employer-owned clip and self-host as H.264 MP4 in `public/media/`

---

## Implications for Roadmap

Research confirms a clean 8-step dependency graph. All steps are independently testable. The ordering below is non-negotiable because each consumer depends on its upstream contract being stable.

### Phase 1: Data Foundations

**Rationale:** `elementInfo.js` extensions and `quizData.js` have zero dependencies. Establishing these data contracts first means all downstream consumers (overlay, quiz, store) can be built against a stable schema. Changing the data shape after the overlay is built causes cascade rework.

**Delivers:** Extended `elementInfo.js` (all 15 entries gain `bhp: string` and `media: MediaRef[]`), new `src/data/quizData.js` with BHP question bank (8-12 questions per scenario, 4 scenario sets), new `src/training/quizSelection.js` pure function.

**Addresses:** BHP-1 content authoring; EX-2 question types (50% scenario-based MC, 30% T/F, 20% sequence); EX-3 per-question explanation field

**Avoids:** MOD-V12-5 (quiz questions hardcoded in UI); ensures `validateQuizAnswer()` is a pure testable function before any quiz UI exists

**Research flag:** Standard patterns — pure data authoring, no technical unknowns. BHP content accuracy (ISO 16092 norm citations) requires expert review before phase closes.

---

### Phase 2: Store Extensions

**Rationale:** Both `StartMenuOverlay` and `QuizController` depend on store actions (`showStartMenu`, `startQuiz`, `submitAnswer`, `finishQuiz`). Writing the store before the UI allows UI components to be built and unit-tested against the real store from day one.

**Delivers:** `trainingStore` gains `showStartMenu: boolean`, `hideMenu()`, `showMenu()` actions; `quiz` slice with `startQuiz/submitAnswer/finishQuiz`; modified `finishedAt` subscriber that branches to `startQuiz()` + `activeModal: 'bhp-quiz'` in `'egzamin'` mode instead of immediately calling `endExam()`

**Addresses:** SM-1 mode gating (prerequisite); EX-1 hybrid exam trigger

**Avoids:** CRIT-V12-5 (scoring double-count — quiz slice isolated from procedure `scoring`); MOD-V12-4 (separate `showStartMenu` flag prevents `activeModal`-mediated ticker pause during menu display)

**Research flag:** Standard Zustand patterns. The `finishedAt` subscriber modification is the only medium-risk change; needs test coverage for the new branch before phase closes.

---

### Phase 3: ElementInfoOverlay (replaces ElementInfoPanel)

**Rationale:** The overlay is the keystone of v1.2 — BHP content, real photos, and video all live inside it. It must be stable before media is added. Building the structure before content separates structural concerns from content concerns.

**Delivers:** `src/ui/ElementInfoOverlay.js` — `dialog.showModal()`, `activeModal === 'element-info'` subscription unchanged, tabs Budowa/BHP/Instrukcja, media slot for `entry.media`, lector button via DI, Escape wired to `store.closeModal()`. `ElementInfoPanel.js` deleted after new class is green. 4 test files updated.

**Addresses:** OV-1 (lightbox), OV-2 (tabs); prerequisite for OV-D2 and BHP content display

**Avoids:** CRIT-V12-4 (panel removal regression — preserve store key, DI signature, lector injection, `getInteractables() === 15`); MOD-V12-3 (`dialog.showModal()` for proper focus trap)

**Research flag:** Standard patterns — direct code read has identified all 5 call sites and 4 test files. Migration checklist is the acceptance criterion: 903 tests green, TWIN-12 passes, manual click smoke (free mode + nauka mode + Esc + lector button present).

---

### Phase 4: StartMenuOverlay

**Rationale:** Depends only on store (Phase 2). Can be built in parallel with Phase 3 if resources allow; in serial, follows Phase 3. Low-risk (pure DOM addition, no Three.js) and delivers immediate UX value.

**Delivers:** `src/ui/StartMenuOverlay.js` — three mode cards, session resume badges from localStorage, mode description on hover (SM-1, SM-2, SM-3); `<div id="start-menu">` in `index.html`; `pm300:start-menu-shown:v1` localStorage persistence

**Addresses:** SM-1, SM-2, SM-3 table-stakes features

**Avoids:** MOD-V12-4 (start menu state machine — `mode` is `null` until confirm; no subscriber fires before menu dismiss; `showStartMenu` not routed through `activeModal`)

**Research flag:** Standard patterns. Only edge case is the `mode: null` initial state guard on existing subscribers; needs explicit test assertion.

---

### Phase 5: Media Pipeline

**Rationale:** After the overlay shell (Phase 3) and `elementInfo.js` `media` field (Phase 1) exist, add `MediaManager` and source/commit media assets. Separating content sourcing from structural overlay work prevents license decisions from blocking code work.

**Delivers:** `src/media/MediaManager.js` (lazy image preload + HEAD validation); `public/media/` populated with CC0/CC-BY/CC-BY-SA photos; `public/media/ATTRIBUTION.txt` with full attribution records; overlay renders `<img>` and `<video>` from `entry.media` array; YouTube-nocookie iframes for instructional videos

**Addresses:** NP-2 (real photos in overlay); OV-D2 (embedded video)

**Avoids:** CRIT-V12-1 (no `import` for media); CRIT-V12-2 (ATTRIBUTION.txt gate; zero CC-NC entries); CRIT-V12-3 (no YouTube downloads; graceful offline fallback); MOD-V12-6 (lazy-load — `<img src>` set synchronously in `_render()`, `<video preload="none">` created in `_render()` not `_build()`)

**Verified media sources with licenses:**

| Asset | URL | License |
|-------|-----|---------|
| Eccentric press at Loschenk manufactory (in-operation) | https://commons.wikimedia.org/wiki/File:Trattenbach_Manufaktur_L%C3%B6schenkohl_Exzenterpresse-9613.jpg | CC BY-SA 4.0 |
| Mechanical press (general industrial) | https://commons.wikimedia.org/wiki/File:Mechanical_press.JPG | CC BY-SA 3.0 |
| 440-ton progressive die stamping press | https://commons.wikimedia.org/wiki/File:SP2-440-Progressive_Die_Press.jpg | CC BY-SA 4.0 |
| Power press with barrier guard animation (OSHA) | https://commons.wikimedia.org/wiki/File:Power_press_animation.gif | Public Domain (U.S. Gov.) |
| Industrial rating plate reference photo | https://commons.wikimedia.org/wiki/File:Rating_plate_on_the_Dalchonzie_power_station_generator_-_geograph.org.uk_-_735379.jpg | CC BY-SA 2.0 |

**Research flag:** Needs a separate authoring task to verify specific CC-licensed YouTube videos of eccentric press operation before embedding (FEATURES.md confidence LOW on this). Use YouTube Advanced Search -> Filter: Creative Commons, search terms "mechanical stamping press operation". Verify license declaration per video before committing embed URL.

---

### Phase 6: Nameplate Texture

**Rationale:** Isolated change inside `_buildNameplate()` in `PressModel.js`, no inter-component dependencies. Can be parallelized with any of Phases 3-5.

**Delivers:** Realistic nameplate texture on 3D mesh via `THREE.TextureLoader`; `colorSpace = THREE.SRGBColorSpace`; `generateMipmaps = false`; POT dimensions (512x256 px); tracked in `MaterialRegistry.trackTexture()`. Primary option: synthetic SVG-designed texture rendered to PNG (100% license-free, most authentic to PM-300 since no CC photo of PM-300 nameplate exists). CE-compliant fields per 2006/42/EC Annex I §1.7.3.

**Addresses:** NP-1 (nameplate texture on 3D mesh)

**Avoids:** MOD-V12-1 (colorSpace omission — washed-out nameplate); MOD-V12-2 (NPOT GPU memory leak — POT dimensions enforced offline before commit); CRIT-V12-4 (`_registerInteractable` call unchanged; `getInteractables() === 15` invariant untouched)

**Research flag:** Standard patterns. Visual acceptance criterion: "mesh color matches source image appearance" (catches colorSpace omission).

---

### Phase 7: QuizController

**Rationale:** Depends on quiz data (Phase 1) and store quiz slice (Phase 2). Follows overlay stabilization (Phase 3) so the `'bhp-quiz'` modal uses the same `dialog.showModal()` pattern.

**Delivers:** `src/ui/QuizController.js` — subscribes to `activeModal === 'bhp-quiz'`; renders question + 4 options; shows per-question corrective feedback with norm reference on wrong answer; final score screen; calls `finishQuiz()` -> `endExam()` -> `SessionOverlay` shows combined SOP + quiz results labeled separately

**Addresses:** EX-1 (quiz trigger + score); EX-2 (question types); EX-3 (per-question feedback); combined scoring in PDF export ("Wynik proceduryczny" and "Wynik BHP")

**Avoids:** CRIT-V12-5 (scoring double-count — `QuizController` calls `submitAnswer()` on quiz slice only, never touches `scoring.score`); MOD-V12-5 (pure data module for questions — `QuizController` imports `quizData.js`, renders it, never defines question strings inline)

**Research flag:** Standard patterns for the controller. New integration test `examHybrid.integration.test.js` is the acceptance criterion.

---

### Phase 8: Application Wiring

**Rationale:** Final integration — wires all new components into `Application` constructor and dispose chain. Last because it is the only step with risk of touching multiple components simultaneously.

**Delivers:** `src/main.js` updated — swap `new ElementInfoPanel()` -> `new ElementInfoOverlay()`, add `new MediaManager()`, `new StartMenuOverlay()`, `new QuizController()`; dispose chain updated (startMenuOverlay before stepPanel; quizController before examPromptModal; mediaManager before lectorService); `pm300:start-menu-shown:v1` bootstrap check; 903+ tests green; bundle < 850 KB verified

**Addresses:** Final integration gate for all v1.2 features

**Avoids:** CRIT-V12-1 (final bundle check as acceptance criterion); CRIT-V12-4 (dispose chain order correct; no ElementInfoPanel reference remaining)

**Research flag:** Standard patterns. Acceptance criterion: full `npm test` suite green (903+ tests), `npm run build` JS total < 850 KB, complete manual smoke across all three modes.

---

### Phase Ordering Rationale

- **Data before consumers:** `elementInfo.js` and `quizData.js` define contracts that overlay, quiz, and store all depend on. Changing data schema after consumers are built causes cascade rework.
- **Store before UI:** Zustand slice actions are the API that UI classes call. Building UI against the real store (not mocks) from day one catches integration bugs early.
- **Overlay before content:** The overlay shell can be built and tested with placeholder data. Adding real photos and BHP text is a separate content-authoring concern that must not block structural work.
- **Nameplate isolated:** `_buildNameplate()` change has no inter-component dependencies; it can run in any slot between Phases 3-7 depending on developer availability.
- **Application wiring last:** Touching `main.js` risks disrupting the running app; keep it as the final integration step once all components are individually green.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | fslightbox size confirmed at 30.7 KB unminified; bundle projection based on actual current bundle (809.94 KB); all decisions verified against official docs |
| Features | HIGH (norms); MEDIUM (UX patterns); LOW (specific CC video URLs) | BHP content grounded in ISO 16092-2, OSHA 1910.217, EU Machinery Directive. UX patterns from NN Group + Articulate. Specific CC YouTube video URLs not yet individually verified. |
| Architecture | HIGH | Based on direct source read of all affected files (main.js, trainingStore.js, ElementInfoPanel.js, RaycastController.js, elementInfo.js, PressModel.js, 4 test files). All integration points traced to line numbers. |
| Pitfalls | HIGH | Vite asset pipeline, CC licensing, Three.js colorSpace/NPOT, dialog accessibility — all from primary sources. YouTube ToS confidence MEDIUM (not Polish-jurisdiction-specific). |

**Overall confidence:** HIGH for implementation decisions. The two medium/low areas (UX patterns for industrial simulators, CC video sourcing) are content and sourcing gaps that do not block architecture or code decisions.

### Gaps to Address

- **CC-licensed YouTube videos of eccentric press operation:** Not individually verified. Designate a content authoring task in Phase 5 to find and verify 2-3 candidates via YouTube Advanced Search -> Creative Commons filter. Until verified, plan overlay without embedded video and add video as enhancement once sourced.

- **Hybrid 3D+quiz UX pattern validation:** No authoritative reference implementation of post-3D-scenario BHP quiz in a browser simulator without SCORM was found. The pattern (scenario complete -> quiz panel -> combined score) is inferred from general e-learning practice. Prototype validation with real users during pilot is recommended before building OV-3 or EX-D1.

- **Quiz pass threshold weight split (SOP vs BHP):** Architecture supports independent scores for "Wynik proceduryczny" and "Wynik BHP". The combined export weight is a product decision. Flag for product owner before Phase 7 closes.

- **EU Machinery Regulation 2023/1230 vs. Directive 2006/42/EC:** For 2026 deployment, 2006/42/EC applies. No action needed unless deployment extends past January 2027.

---

## Sources

### Primary (HIGH confidence)

- ISO 16092-2:2019 — mechanical press safety, clutch/brake, antirepeat, two-hand control: https://www.iso.org/standard/63389.html
- OSHA 29 CFR 1910.217 — mechanical power presses: https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.217
- EU Machinery Directive 2006/42/EC Annex I §1.7.3 — nameplate fields: https://eur-lex.europa.eu/eli/dir/2006/42/oj/eng
- Vite Static Asset Handling — `public/` vs `src/assets/`, `assetsInlineLimit`: https://vite.dev/guide/assets
- Creative Commons license definitions and NC commercial use FAQ: https://creativecommons.org/share-your-work/cclicenses/
- fslightbox.com/javascript — 30.7 KB unminified, MIT free tier: https://fslightbox.com/javascript
- Three.js issue #12469 — NPOT texture memory not released: https://github.com/mrdoob/three.js/issues/12469
- HTML `<dialog>` focus trap with `showModal()`: https://css-tricks.com/there-is-no-need-to-trap-focus-on-a-dialog-element/
- YouTube Terms of Service §5 — download prohibition: https://www.youtube.com/static?template=terms
- Direct source read: `src/main.js`, `src/state/trainingStore.js`, `src/ui/ElementInfoPanel.js`, `src/RaycastController.js`, `src/data/elementInfo.js`, `src/PressModel.js`

### Secondary (MEDIUM confidence)

- Nielsen Norman Group — Overuse of Overlays: https://www.nngroup.com/articles/overuse-of-overlays/
- Articulate — Lightbox slides for just-in-time learning: https://community.articulate.com/blog/e-learning-challenges/using-lightbox-slides-for-just-in-time-learning-433/1108488
- Spotlight Safety — scenario-based quiz questions predict on-job performance: https://spotlightsafetyinc.com/safety-training-quizzes/
- KINGKLAN Mechanical Power Press Safety Training: https://www.kinglanpress.com/mechanical-power-press-safety-training
- HARSLE Power Press Working Principle and Maintenance: https://www.harsle.com/power-press-working-principle/

### Tertiary (LOW confidence — validate before use)

- YouTube CC-licensed eccentric press videos: `site:youtube.com "mechanical press" "creative commons"` — specific videos not yet verified per-video; validate license declaration before embedding
- Pexels/Pixabay stamping press photos — verified in research to return hydraulic/injection presses, NOT eccentric; do not use without direct visual verification

---

*Research completed: 2026-06-13*
*Ready for roadmap: yes*
