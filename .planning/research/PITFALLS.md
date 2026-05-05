# Domain Pitfalls — PM-300 Trener (Training Simulator + SOP Validation)

**Domain:** Browser-based industrial training simulator with strict procedure validation, layered onto an existing Three.js + GSAP + Vite vanilla codebase.
**Researched:** 2026-05-05
**Confidence:** HIGH for Three.js / Zustand / Vitest specifics (Context7-class sources, official issues, community wisdom). MEDIUM for safety-training pedagogy (peer-reviewed literature exists but quality varies). MEDIUM for liability boilerplate (Polish-jurisdiction specifics not deeply researched — flagged).

This document is meant to be **read by the roadmap planner**. Each pitfall is mapped to the phase that should address it. "Phase X" labels are suggestive — final numbering is the roadmap planner's call. The phase taxonomy used here matches the milestone scope: Phase A (digital-twin geometry expansion), Phase B (raycasting + tooltips), Phase C (Zustand store + state plumbing), Phase D (procedure engine + validateStep), Phase E (highlights + visual feedback), Phase F (scoring + JSON/PDF export), Phase G (educational layer: free roam, exploded view), Phase H (testing infrastructure), Phase Z (cross-cutting: liability, codebase hygiene).

---

## Critical Pitfalls

These cause **rewrites, lost user trust, or — in safety training — real-world harm**. Treat each as a roadmap-level constraint, not a polish-pass concern.

---

### CRIT-1: Simulator becomes a substitute for real training in the trainee's mind

**Domain:** UX / pedagogy / liability. **Phase:** Z (cross-cutting), reinforced in Phase D and Phase F.

**What goes wrong:** A trainee completes the four SOPs in `PM-300 Trener`, scores 100%, and concludes "I know how to operate the press." On the real shop floor they encounter sensory cues the simulator cannot reproduce — vibration, the smell of overheated oil, the exact resistance of a real two-hand control, the noise of a clutch engaging late. They make a confident-but-wrong decision because the simulator never taught them that real machines have slack, wear, lubrication degradation, and surprises.

**Why it happens:** Digital simulators famously lack haptics and sensory fidelity ([NCBI / occupational safety review](https://pubmed.ncbi.nlm.nih.gov/37742676/)). Gamification compounds the risk by rewarding completion ("score 100") rather than understanding. Once a trainee passes a clean digital test they over-generalize their competence.

**Consequences:** Hand injury, fatal crush incident, employer liability. PM-300-class eccentric presses have a documented history of hand amputations from clutch/brake misuse — this is not hypothetical.

**Prevention:**
1. **Mandatory disclaimer banner on first launch** and on every PDF/JSON export footer: _"Symulator nie zastępuje szkolenia stanowiskowego ani instruktażu BHP. Jest narzędziem dydaktycznym do nauki kolejności kroków SOP. Obsługa rzeczywistej prasy mimośrodowej wymaga uprawnień, kwalifikacji i nadzoru zgodnie z przepisami BHP i instrukcją producenta."_
2. **Score the procedure, not the trainee.** Phrasing in UI: "Zaliczono procedurę" (procedure passed) — never "Operator wykwalifikowany" or "Certyfikat".
3. **PDF export must NOT look like a certificate.** No seal, no "Certyfikat ukończenia". Title it "Raport sesji szkoleniowej" with explicit "nie jest dokumentem uprawnień" line.
4. **Briefing screen before each SOP** explicitly lists what the simulator does NOT teach (sensory cues, judgment under fatigue, mechanical wear).

**Detection / warning signs:** Stakeholder asks if the export "counts as the training record." UI copy creeps from "ukończono" to "zaliczono" to "uprawniony". Anyone asks for a signature line on the PDF.

**Roadmap flag:** This pitfall must be designed in from the start, not bolted on. Add disclaimer copy review as an explicit milestone gate. **Confidence:** HIGH (well-documented pedagogical concern; specific Polish BHP wording is MEDIUM — recommend legal review before deploy).

---

### CRIT-2: Stale closures in `validateStep()` capturing old SOP definitions

**Domain:** Procedure engine. **Phase:** D.

**What goes wrong:** `validateStep` is implemented as an arrow function that closes over `currentSOP.steps`. When the trainee restarts a procedure (or switches between the four SOPs), the validator keeps validating against the previous SOP's step list. Trainee clicks E-stop in "fault" SOP and is told they violated the "startup" SOP order.

**Why it happens:** Closures over module-scoped or constructor-bound references are the canonical bug in vanilla JS state machines. Particularly insidious because the wrong SOP usually shares early steps with the right one, so the bug only fires on later steps.

**Prevention:**
1. **Validator receives all state as arguments**, no closures over SOP definition: `validateStep({ sop, currentStepIndex, completedSteps, action })`.
2. **Pure function, no `this`**, exported as a module-level function. Easy to test.
3. **SOP is identified by string id, not by object reference** — `sopId: 'startup' | 'cycle' | 'stop' | 'fault'`. Validator looks up the definition from a registry keyed by id at call time.
4. **One Vitest case per SOP × per "wrong action at step N" pair** — exhaustive matrix, generated programmatically.

**Code shape (recommended):**
```js
// procedure/validateStep.js — pure function
export function validateStep({ sopId, completedStepIds, attemptedAction }) {
  const sop = SOP_REGISTRY[sopId];                       // re-resolve every call
  const nextStep = sop.steps.find(s => !completedStepIds.includes(s.id));
  if (!nextStep) return { ok: false, reason: 'PROCEDURE_ALREADY_COMPLETE' };
  if (nextStep.expectedAction !== attemptedAction) {
    return { ok: false, reason: 'WRONG_STEP', expected: nextStep, got: attemptedAction };
  }
  return { ok: true, completedStep: nextStep };
}
```

**Detection:** Switching SOP mid-session causes false-negative "out of order" errors. Re-running same SOP after completion works the first time and fails the second.

**Confidence:** HIGH.

---

### CRIT-3: Hard-coded step indices instead of step ids

**Domain:** Procedure engine. **Phase:** D.

**What goes wrong:** Code references step `2` (zero-indexed) for "close guards". Later a domain expert reviews the SOP and inserts a new step at position 1 ("verify oil level"). Now `2` means "close guards" only in some places and "check E-stop" in others. Tests pass because they were written with the same wrong index. Real bug ships.

**Why it happens:** Index-based addressing is convenient at first; the team doesn't anticipate SOP edits. Eccentric press SOPs in particular are subject to revision — an audit, an incident report, an updated machine manual all force step list edits.

**Prevention:**
1. **Every step has a stable string id** (`'verify_oil'`, `'close_guards'`, `'release_estop'`). Never reference steps by ordinal position outside of the rendering layer.
2. **Renderer derives "Krok 3 z 7" from index at render time only** — never persists or transmits the index.
3. **Lint rule (or unit test) forbidding numeric step references** in any file outside the renderer.
4. **localStorage persistence stores step ids**, not indices. (See PERSIST-1.)

**Detection:** `git blame` shows multiple files touched whenever a step is added. Tests need to be renumbered when SOP edits happen. PR diffs show off-by-one corrections in unrelated files.

**Confidence:** HIGH.

---

### CRIT-4: Color-only feedback (red/green) excludes ~8% of male trainees

**Domain:** UX / accessibility. **Phase:** E.

**What goes wrong:** Wrong action → red emissive pulse. Correct action → green emissive pulse. Deuteranope (red-green colorblind) trainees see two near-identical mid-luminance pulses and cannot tell error from success. They progress through the SOP convinced they're correct because the simulator "lit up". Real-world consequence: same trainee ignores the red blink on a real machine warning lamp.

**Why it happens:** Designers default to red/green because that's the cultural convention; colorblindness affects ~8% of men, ~0.5% of women. In an industrial workforce skewed male, this is a non-trivial user fraction.

**Prevention:**
1. **Redundant encoding on every state change**: color + icon + text + sound (optional, off by default).
   - Correct: green pulse + checkmark icon overlaid on the part + "OK" badge in checklist.
   - Error: red pulse + X icon overlaid + "BŁĄD: <reason>" badge + slight camera shake.
2. **Use ColorBrewer-safe red/green** (e.g., #D55E00 for error, #009E73 for success — Wong palette) rather than pure RGB red/green.
3. **Settings toggle: high-contrast mode** that replaces emissive pulse with outline shader (BLACK outline for error, WHITE outline for success) — works for all color vision types.
4. **Test with a colorblindness simulator browser extension** at least once per phase.

**Detection:** Designer says "we can just turn the part red." No icons in the highlight spec.

**Confidence:** HIGH.

---

### CRIT-5: Raycaster fired every frame instead of on `mousemove`

**Domain:** Three.js performance. **Phase:** B.

**What goes wrong:** `InteractionController` runs raycaster from inside the GSAP ticker callback. Each frame: 1 ray × N meshes, even when the mouse hasn't moved. With ~30 clickable parts and tooltips on hover, this burns 1.8M intersection tests/minute on idle. Frame budget on integrated graphics drops below 16ms; cycle animation stutters.

**Why it happens:** Three.js examples often show raycaster inside the render loop because that's how the docs explain it. Trivial cases don't expose the cost.

**Consequences:** Failure to hit the 60 FPS constraint stated in PROJECT.md. Stuttering breaks the illusion of realism — and a stuttering safety simulator looks unprofessional, undermining trust in the training.

**Prevention:**
1. **Raycaster fires only on `pointermove` and `pointerdown` events**, not from the GSAP ticker.
2. **Throttle pointermove with `requestAnimationFrame`** (one rAF per pointermove burst), so multiple mouse events per frame coalesce to one raycast.
3. **Maintain a pre-filtered "interactable" list** (the ~30 clickable parts) — pass it to `intersectObjects([...interactables], false)` with `recursive: false`. Do not raycast the entire scene.
4. **Use `BoundingSphere` precomputed on each interactable's geometry** (`geometry.computeBoundingSphere()`) — Three.js raycaster honors it for early-out.
5. **For per-frame highlight pulse**: the pulse is driven by GSAP tween of `material.emissiveIntensity`, NOT by re-running the raycaster. Pulse and pick are independent.

**Detection:** Chrome DevTools Performance tab shows `raycast` calls dominating frame budget. FPS drops when the user just hovers without clicking.

**Confidence:** HIGH ([discourse.threejs.org performance issues](https://discourse.threejs.org/t/significant-performance-drop-with-raycaster/53622), [github issue #16153](https://github.com/mrdoob/three.js/issues/16153)).

---

### CRIT-6: Shared emissive material mutated in place causes "everything glows" bug

**Domain:** Three.js materials. **Phase:** E.

**What goes wrong:** The press uses one `MeshStandardMaterial` instance shared across multiple meshes (the existing `PressModel` does exactly this — see line 23-29 of `PressModel.js`). `highlightPart('shaft', red)` mutates `material.emissive` directly. Result: the shaft, eccentric, AND every other part using the same material all turn red. Trainee gets a meaningless universal-red feedback.

**Why it happens:** Three.js materials are shared by reference. The existing codebase explicitly uses one shared material to save GPU state — this was correct for the initial demo but becomes a bug the moment you add per-part highlights.

**Prevention:**
1. **Phase E migration step**: every clickable mesh gets its **own cloned material**. This is a deliberate one-time refactor, documented in a migration note in `PressModel.js`.
2. **Track cloned materials in a registry** (`Map<meshName, Material>`) so they can all be `.dispose()`-ed during scene teardown / hot reload.
3. **Reset hooks**: when a session ends, iterate the registry and reset `emissiveIntensity = 0`. Do NOT swap materials; just animate intensity.
4. **Unit-test guard**: assert `pressModel.shaft.material !== pressModel.eccentric.material` after build.

**Memory hygiene:** Cloned materials must be disposed on hot reload (Vite HMR) or you leak GPU buffers ([discoverthreejs.com tips](https://discoverthreejs.com/tips-and-tricks/), [roger-chi.vercel.app three.js leaks](https://roger-chi.vercel.app/blog/tips-on-preventing-memory-leak-in-threejs-scene)). Add a `dispose()` method to `PressModel` that iterates the registry; call it from `import.meta.hot?.dispose(...)`.

**Detection:** Highlighting one part lights up many. Materials count in `renderer.info.memory` grows on every restart of dev server.

**Confidence:** HIGH.

---

### CRIT-7: Double source of truth — Zustand store vs `mesh.userData`

**Domain:** State management. **Phase:** C.

**What goes wrong:** "Is the guard open?" is stored both in the Zustand store (`store.guards.left.isOpen`) and on the mesh (`leftGuardMesh.userData.isOpen`). Click handler updates the store. Animation handler reads `userData`. They diverge: store says closed, mesh says open. `validateStep` consults the store and approves "start motor" while the geometry shows the guard physically open. Visual contradicts logic — and in a safety simulator that's a credibility-destroying bug.

**Why it happens:** Three.js encourages stashing data on `userData`. Zustand encourages a centralized store. Both are valid in isolation; together they create dual-write hazard.

**Prevention:**
1. **One rule, repeated everywhere**: **Zustand is the source of truth for procedure-relevant state. `userData` only holds Three.js metadata that the renderer needs and the validator does not** (e.g., `userData.partId`, `userData.originalMaterial`, `userData.tooltipKey`).
2. **Procedure-relevant state in `userData` is forbidden.** Add a code review checklist line.
3. **Renderer subscribes to the store** and applies state to the scene (one-way data flow: store → scene). The scene never writes back to the store except through explicit user-action handlers (click, hover).
4. **Document the data-flow diagram** in `.planning/codebase/ARCHITECTURE.md` once Phase C lands.

**Detection:** Any code that does `mesh.userData.state = ...` should fail review. Any divergence visible during play (animation says X, checklist says Y) is a smoke test for this bug.

**Confidence:** HIGH.

---

### CRIT-8: Race condition on rapid clicks (double-click registers as two valid steps)

**Domain:** State management + procedure engine. **Phase:** C and D.

**What goes wrong:** Trainee double-clicks the E-stop button (panicked, fast double-tap). Click 1 is dispatched, validator runs against state at time T0, returns OK, side-effect schedules animation. Click 2 fires before the store has committed the new completed-steps list (microtask still pending). Validator runs again against still-old state and **also approves** — now the trainee gets credit for the same step twice, or worse, the store ends in inconsistent state.

**Why it happens:** Zustand `setState` is synchronous in vanilla mode — but if any side-effect (GSAP tween start, async animation completion) is between the click and the state commit, you get a window. Particularly bad if the validator awaits an animation before marking complete.

**Prevention:**
1. **Validator is synchronous and runs inside the click handler before any animation kicks off.** State commit BEFORE animation. Always.
2. **Lock the input during animation**: store has `isAnimating: boolean` flag. Click handler early-returns if true.
3. **Idempotency**: validator returns "ALREADY_COMPLETED" for steps already in `completedStepIds`, never advances the index. Tests for this case.
4. **Debounce only as a defense-in-depth**, not as the primary fix.

**Detection:** Stress test: a Vitest case that fires 100 click events for the same step in a tight loop and asserts the step is recorded exactly once. Any deviation = bug.

**Confidence:** HIGH.

---

## Moderate Pitfalls

These cause **frustration, regressions, and rework**, but rarely safety-critical outcomes.

---

### MOD-1: Subscriber leaks on Zustand vanilla outside React

**Domain:** Zustand vanilla. **Phase:** C.

**What goes wrong:** PM-300 has no React component lifecycle. The team subscribes to the store in `UI.js` constructor and never unsubscribes. On dev-server hot reload (Vite HMR), the old `UI` instance is replaced but its subscriber still fires — now two subscribers exist. After a few HMR cycles, every store change triggers 5+ DOM updates, and the dev experience degrades. In production-build it doesn't manifest, so it's missed.

**Why it happens:** Zustand-in-vanilla requires manual unsubscribe. There is no `useEffect` cleanup ([github discussion #2054](https://github.com/pmndrs/zustand/discussions/2054)).

**Prevention:**
1. **Every `store.subscribe(...)` call returns an unsubscribe function — capture it on the class instance** as `this._unsub.push(unsub)`.
2. **Each class with subscribers exposes a `dispose()` method** that calls every captured unsubscribe.
3. **`Application` calls `dispose()` on all sub-systems in an `import.meta.hot?.dispose(() => app.dispose())` block** at the bottom of `main.js`.
4. **Alternatively: put all subscribe logic in module-top-level once** (single subscriber, never recreated) — works only if the subscriber doesn't reference instance state.

**Confidence:** HIGH.

---

### MOD-2: localStorage hydration on load with stale schema

**Domain:** Persistence. **Phase:** F.

**What goes wrong:** v1 ships with `{ scoring: { errorCount, time, missedSteps } }`. v1.1 adds `{ scoring: { errorCount, time, missedSteps, sopId } }`. Old localStorage entries lack `sopId`; the dashboard renders `undefined` everywhere or — worse — `sopId.toLowerCase()` throws and the whole UI breaks on first load.

**Why it happens:** Schema migration is forgotten in MVPs. localStorage entries persist across reloads and across versions.

**Prevention:**
1. **Versioned localStorage key**: `pm300:session:v1`. Bump the version on schema break. Old keys are read once for migration, then deleted or kept as `pm300:session:v0:archived`.
2. **Read with a parser that validates and coerces**, not raw `JSON.parse`. A tiny schema check (no need for Zod given the ~1.2KB Zustand budget — a hand-rolled `validateSession(obj)` is fine).
3. **On parse failure, log a warning and start a clean session** — never crash the app for stale data.

**Detection:** v1.1 deploys, users see broken UI on first load until they clear storage. Testers don't catch it because they always test from clean state.

**Confidence:** HIGH.

---

### MOD-3: Procedure error messages in Polish reveal English internals when serialized

**Domain:** i18n / Polish-language. **Phase:** D and F.

**What goes wrong:** `validateStep` returns `{ ok: false, reason: 'WRONG_STEP', expected: 'release_estop', got: 'engage_clutch' }`. The renderer interpolates this into a Polish message: `"Błędny krok: oczekiwano 'release_estop', wykonano 'engage_clutch'"`. Trainee sees English step ids in a Polish UI. Worse: the JSON export contains these English ids in a "report" file the manager opens — looks unprofessional and breaks the illusion that the tool is a Polish product.

**Why it happens:** Step ids are English (per project conventions), but they leak through the message templating layer.

**Prevention:**
1. **Two-layer naming**: every step has `id` (English, stable, code-facing) AND `label` (Polish, user-facing, may change). Validator returns the step object; renderer reads `.label` for display.
2. **Central translation table** even for a Polish-only product: `src/i18n/pl.js` keyed by step id. Avoids hardcoded Polish in JS files (where editors lose UTF-8 BOM, fonts choke on `ł`, code reviewers ask "what does this string mean?"). Makes future EN/DE port a 1-day effort instead of a 1-month effort.
3. **JSON/PDF export uses labels, not ids**, in human-readable fields. Optionally include the id in a separate `_debug` field for support.
4. **Lint rule**: no Polish string literal directly in `*.js` files except in `src/i18n/`.

**Confidence:** HIGH.

---

### MOD-4: Plurals via string concatenation ("3 błędów" vs "1 błąd" vs "2 błędy")

**Domain:** Polish-language. **Phase:** F.

**What goes wrong:** Polish has three plural forms (singular / few / many). Code does `${n} błędów` everywhere. UI shows "1 błędów" and "2 błędów" — both grammatically wrong. Native speakers find it instantly jarring; in a safety-training context where credibility matters, this looks like the tool was a hobby project.

**Why it happens:** Devs default to English-style "1 error / N errors" thinking. Polish needs: `1 → "1 błąd"`, `2-4 → "2 błędy"`, `5-21 → "5 błędów"`, `22-24 → "22 błędy"`, `25-31 → "25 błędów"`, …

**Prevention:**
1. **Use `Intl.PluralRules('pl-PL')`** — built-in, zero deps, returns `'one' | 'few' | 'many' | 'other'`. Zero KB cost.
2. **Pluralization helper**: `plPlural(n, { one: 'błąd', few: 'błędy', many: 'błędów' })`. Used everywhere with countables.
3. **Test cases**: 0, 1, 2, 5, 21, 22, 25 — all assert correct form.

**Code shape:**
```js
const PR = new Intl.PluralRules('pl-PL');
export function plPlural(n, forms) {
  return `${n} ${forms[PR.select(n)] ?? forms.other ?? forms.many}`;
}
plPlural(1, { one: 'błąd', few: 'błędy', many: 'błędów' }); // "1 błąd"
plPlural(2, { one: 'błąd', few: 'błędy', many: 'błędów' }); // "2 błędy"
plPlural(5, { one: 'błąd', few: 'błędy', many: 'błędów' }); // "5 błędów"
```

**Confidence:** HIGH.

---

### MOD-5: jsPDF default font cannot render Polish diacritics

**Domain:** Export / Polish-language. **Phase:** F.

**What goes wrong:** PDF export "works" in dev. Manager opens the file, sees `B  d podczas startu` instead of `Błąd podczas startu`. The `ł, ą, ę, ó, ś, ć, ń, ź, ż` characters are silently dropped because jsPDF's 14 standard fonts are ASCII-only ([github jsPDF #12](https://github.com/parallax/jsPDF/issues/12)).

**Why it happens:** Default PDF fonts (Helvetica, Times, Courier) ship with Latin-1, no Polish glyphs. jsPDF makes you embed a custom TTF via base64 + fontconverter ([copyprogramming jsPDF UTF-8 guide](https://copyprogramming.com/howto/how-to-enable-utf-8-in-jspdf-library)). Devs forget this until QA opens an exported file.

**Prevention:**
1. **Embed a TTF font with full Polish character set during Phase F** — recommend Roboto (Apache 2.0), DejaVu Sans (free), or similar permissively-licensed font with Polish diacritics. Do NOT use a font with restrictive licensing.
2. **Convert via jsPDF fontconverter**, ship the base64 .js as a static asset, register at PDF-builder init.
3. **Smoke test**: PDF export with text `"Zażółć gęślą jaźń"` (Polish pangram with all 9 diacritics) — open in Acrobat AND Chrome PDF viewer (they have different glyph fallback behavior).
4. **Document the font in LICENSE** and include attribution in PDF footer if license requires it.

**Code shape:**
```js
import { jsPDF } from 'jspdf';
import { robotoBase64 } from './fonts/roboto-base64.js';
const doc = new jsPDF();
doc.addFileToVFS('Roboto-Regular.ttf', robotoBase64);
doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
doc.setFont('Roboto');
doc.text('Zażółć gęślą jaźń', 10, 20);
```

**Confidence:** HIGH.

---

### MOD-6: jsdom + Three.js — WebGLRenderer cannot initialize

**Domain:** Testing. **Phase:** H.

**What goes wrong:** First Vitest run on `PressModel` test imports the file, which top-level instantiates a `MeshStandardMaterial` (which calls `getContext('webgl2')`), which fails in jsdom because jsdom has no WebGL ([three.js issue #17752](https://github.com/mrdoob/three.js/issues/17752)). Test suite explodes with "Unable to create WebGL context."

**Why it happens:** jsdom emulates DOM but not WebGL. happy-dom is the same. Three.js classes that create materials/textures don't need WebGL until they're rendered, but anything that touches `WebGLRenderer` does.

**Prevention:**
1. **Architectural rule**: pure logic does NOT import Three.js. Procedure engine, scoring, validator, store actions — all live in modules that only import `three` for types/JSDoc, never for runtime classes. These are testable in jsdom natively.
2. **For tests that DO need Three.js classes** (geometry math, material wiring): use `vitest --pool=threads --environment=node` with a manual `globalThis.HTMLCanvasElement.prototype.getContext = () => fakeGL`. Stub returns `null` for unrecognized methods. Use `webgl-mock` ([Namamono1129/webgl-mock-threejs](https://github.com/Namamono1129/webgl-mock-threejs)) if needed.
3. **Do NOT test the renderer.** Test the model logic that decides what to render. Keep `SceneSetup` and the GSAP-ticker integration as manual-test-only.
4. **Test environment per file**: `// @vitest-environment jsdom` at the top of DOM tests; `// @vitest-environment node` for pure logic.

**Phase H scope guard:** Resist the urge to "test the whole pipeline." Test the procedure engine, the validator, the scoring, the store reducers. That's where bugs live and that's what's testable.

**Confidence:** HIGH.

---

### MOD-7: Memorizing the simulator instead of the procedure

**Domain:** Pedagogy. **Phase:** D and G.

**What goes wrong:** Trainee runs the same SOP 20 times. They learn "click the part in the lower-left corner, then the green button, then the lever" — they have NOT learned what those parts do or why the order matters. On a real PM-300 with slightly different layout, they're lost.

**Why it happens:** Game-loop reinforcement of muscle memory without conceptual scaffolding. Same problem as multiple-choice tests where students memorize answer positions.

**Prevention:**
1. **Randomize non-essential variables** between runs: starting camera angle, panel layout (within reason), tooltip phrasing. Force the trainee to re-identify components, not pattern-match positions.
2. **"Why" prompts**: every step in checklist has a small "?" that expands a short Polish explanation of WHY this step matters. Trainee must view it at least once per SOP before scoring counts as "complete with understanding".
3. **Spaced repetition** of failed steps: if a trainee fails step X, the next session prioritizes a SOP that includes X.
4. **Free-roam mode (Phase G)** is the antidote: students explore without procedure pressure. Make it the default first-launch experience, not a hidden option.

**Confidence:** MEDIUM (drawn from learning-science literature; not domain-specific to press operation).

---

### MOD-8: Retry abuse — score resets every retry, no penalty for "guess until you pass"

**Domain:** Pedagogy / scoring. **Phase:** F.

**What goes wrong:** Trainee fails step 3, restarts SOP, this time knows step 3 by elimination, passes. Score: 100/100. They learned nothing — they brute-forced the simulator. Score becomes meaningless.

**Prevention:**
1. **Cumulative scoring across attempts within a session**: errors persist; restarting only resets state, not the error log.
2. **"Honest mode" toggle**: optional locking after a failure (must wait 30s, must view the "why" tooltip, must re-read the step description) before retry is allowed. Default ON for assessment sessions.
3. **PDF export shows attempt count** prominently — manager sees "Procedura zakończona w 4 podejściu" instead of just "Zaliczono".
4. **No silent restarts**: every restart logged with timestamp.

**Confidence:** MEDIUM.

---

### MOD-9: GSAP tweens stacking on rapid exploded-view toggle

**Domain:** Three.js animations. **Phase:** G.

**What goes wrong:** User clicks "Exploded view" toggle five times fast. Each click starts a new GSAP tween of every part's position. Tweens interfere; parts end up in nonsensical mid-positions. Memory grows because old tweens are not killed.

**Why it happens:** GSAP doesn't auto-cancel previous tweens of the same target unless you use `overwrite: 'auto'` or kill them explicitly.

**Prevention:**
1. **Always use `overwrite: 'auto'`** on tweens that target shared properties: `gsap.to(part.position, { x: ex, overwrite: 'auto', ... })`.
2. **Maintain a tween registry**: when starting an exploded-view tween, kill any prior tween in the registry first. `prevTween?.kill(); prevTween = gsap.to(...)`.
3. **Disable the toggle button while tween is in flight**, re-enable on `onComplete`.
4. **Use a single timeline** for exploded view (`gsap.timeline()`) so one `.kill()` call cleans up everything.

**Confidence:** HIGH.

---

### MOD-10: Pulsing emissive animation creating GC churn

**Domain:** Three.js performance. **Phase:** E.

**What goes wrong:** Pulse implemented as `setInterval(() => mesh.material.emissive.setHex(nextColor), 16)` allocating a new color object every frame. Or pulse uses `new THREE.Color(...)` inside the tween's onUpdate. GC ticks every few seconds; frame stutters every GC tick.

**Prevention:**
1. **Animate `emissiveIntensity` (number), not `emissive` (Color object)**. Numbers are stack-allocated; no GC. Pulse = `gsap.to(material, { emissiveIntensity: 1, yoyo: true, repeat: -1, duration: 0.6 })`.
2. **Pre-allocate any Color/Vector3 buffers used per-frame** as instance fields, mutate with `.copy()` or `.setRGB()`, never `new`.
3. **Driven by GSAP, not setInterval** — GSAP integrates with the existing ticker (single source of timing per ARCHITECTURE.md).

**Confidence:** HIGH.

---

### MOD-11: Frustum culling hiding clickable parts when zoomed in

**Domain:** Three.js. **Phase:** B and G (camera controls).

**What goes wrong:** OrbitControls is added (per CONCERNS.md known limitation). Trainee zooms in close to the slider. Camera near plane is too far; or the part is technically off-frustum but should still be raycastable. Trainee clicks where the part should be and gets nothing — or clicks on a different part behind it.

**Why it happens:** Default camera near = 0.1 may be too far for a precision close-up. Frustum culling on small meshes near the camera. Raycaster respects `mesh.visible` but not frustum directly — but if the mesh is culled `mesh.visible` may flip in user code.

**Prevention:**
1. **Set camera near plane appropriate for press scale** (e.g., 0.05 if r=0.8 units).
2. **OrbitControls minDistance / maxDistance** clamped to sensible bounds — trainee can't fly inside the geometry.
3. **Do not use `mesh.frustumCulled = false` on everything** — that defeats the optimization. Only apply to small frequently-clicked parts (E-stop button is the canonical case).
4. **Manual test**: zoom to extremes (max-out and full-in), click each part, confirm it registers.

**Confidence:** MEDIUM.

---

### MOD-12: Tooltip flicker on adjacent meshes

**Domain:** Three.js raycasting + DOM. **Phase:** B.

**What goes wrong:** Mouse moves over the boundary between shaft and eccentric (which are children of the same group). Each pointermove flips the tooltip target back and forth — tooltip flickers visibly between two labels.

**Why it happens:** Sub-pixel mouse jitter combined with adjacent meshes that share an edge. Raycaster picks whichever is fractionally closer this frame.

**Prevention:**
1. **Hover hysteresis**: only switch tooltip if new target is the same for ≥2 consecutive raycasts, OR use a small dwell time (50ms).
2. **Pick the topmost-named ancestor**: walk up `intersected.parent` until you hit something with `userData.partId`. Two adjacent geometries that belong to the same logical "part" return the same partId.
3. **Tooltip fades in/out with 100ms transition** — masks small flicker.

**Confidence:** MEDIUM.

---

### MOD-13: EffectComposer / postprocessing overdraw cost

**Domain:** Three.js performance. **Phase:** E (if outline pass adopted).

**What goes wrong:** Team adds OutlinePass for clearer affordance per CONCERNS.md path-forward. Outline pass renders an extra full-screen depth + edge-detect, ~+5-15ms on integrated graphics. With raycaster already taxing, frame budget blows past 16ms. 60 FPS target lost.

**Prevention:**
1. **Benchmark before committing to postprocessing.** Measure idle FPS, hover FPS, exploded-view FPS — without OutlinePass, then with. Decide based on numbers.
2. **If OutlinePass too expensive**: use a cheaper "second mesh with BackSide and slight scale" outline trick on the highlighted part only.
3. **Or use emissive only** — it's already animated; sufficient for most users; no postprocessing needed.
4. **Resolution scaling**: render outline pass at `0.5x` viewport resolution if needed.

**Confidence:** MEDIUM.

---

## Minor Pitfalls

These cause **dev-time annoyance and small bugs**.

---

### MIN-1: `currentAngle` grows without modulo 2π — known issue

**Domain:** Existing codebase. **Phase:** Z (hygiene, do early).

**What goes wrong:** Per CONCERNS.md and ARCHITECTURE.md, `Application.tick()` does not modulo `currentAngle`. After ~10⁴ seconds of runtime, float precision degrades. In a long unattended demo, animation jitters subtly.

**Prevention:** One-line fix: `this.currentAngle = (this.currentAngle + dω) % (Math.PI * 2)`. Do during Phase A (digital-twin expansion) since you're already touching `Application.tick()`.

**Confidence:** HIGH.

---

### MIN-2: Two `style.css` files — known issue

**Domain:** Existing codebase. **Phase:** Z.

**What goes wrong:** Documented in CONCERNS.md. Root `style.css` wins, `src/style.css` is dead. Editing the wrong one wastes time.

**Prevention:** Delete `src/style.css`, remove import from `main.js` line 1. Single source of truth at root. Add a comment at top of `style.css`: `/* This is the only stylesheet. Do not create src/style.css. */`.

**Confidence:** HIGH.

---

### MIN-3: GSAP ticker assumes deltaTime in milliseconds — known but undocumented

**Domain:** Existing codebase. **Phase:** Z.

**What goes wrong:** Per CONCERNS.md. GSAP upgrade silently breaks timing.

**Prevention:** Pin GSAP at `^3.15.0` (caret allows minor) or `~3.15.0` (tilde stricter). Add comment block above `tick()` referencing the GSAP docs URL. Add a startup-time sanity check: tween a known duration and assert it ran in ~the expected wall-clock time.

**Confidence:** HIGH.

---

### MIN-4: Existing UI.js has stray closing brace — known issue

**Domain:** Existing codebase. **Phase:** Z (do FIRST, before anything else).

**What goes wrong:** Per CONCERNS.md, `src/UI.js` line 67 has an extra `}`. Currently parses by luck. Strict parsers / future tooling may fail.

**Prevention:** Fix in the very first phase commit. Trivial.

**Confidence:** HIGH.

---

### MIN-5: WebGL context loss on tab backgrounding

**Domain:** Three.js. **Phase:** Z (defer unless reported).

**What goes wrong:** Per CONCERNS.md known limitation. Tab backgrounded long enough → WebGL context dropped → blank canvas on resume. Trainee thinks the simulator crashed.

**Prevention:** Listen for `webglcontextlost` / `webglcontextrestored` on `renderer.domElement`. On loss: pause GSAP ticker, show Polish overlay "Kontekst graficzny utracony — odśwież stronę" (or auto-rebuild on restore). Document as a v1 limitation if not addressed.

**Confidence:** MEDIUM.

---

### MIN-6: PressModel hard-coded geometry parameters

**Domain:** Existing codebase. **Phase:** Defer to v2.

**What goes wrong:** Per CONCERNS.md. Single-press v1 means low impact.

**Prevention:** Accept as-is. Address only if multi-machine support is added.

**Confidence:** HIGH.

---

### MIN-7: PhysicsEngine missing input validation

**Domain:** Existing codebase. **Phase:** H (when adding tests).

**What goes wrong:** `r > l·sin(α)` violation produces NaN. Currently impossible because `r=0.8, l=4.0`, but a future config UI could break it.

**Prevention:** Add `if (r >= l) throw new Error(...)` at PressModel constructor. Add Vitest cases for edge inputs (α=0, α=π, r=0, r=l-ε).

**Confidence:** HIGH.

---

## Phase-Specific Warnings (Cross-Reference Table)

| Phase | Topic | Most Likely Pitfall | Mitigation Reference |
|-------|-------|---------------------|----------------------|
| Z (hygiene, do first) | Codebase cleanup | Stray brace in UI.js, dead style.css, unbounded angle, GSAP ticker assumption | MIN-1 through MIN-5 |
| Z (cross-cutting) | Liability copy | Trainees treating simulator as certification | CRIT-1 |
| A (digital-twin geometry expansion) | Adding ~30 meshes | Materials shared across new parts → CRIT-6 fires when Phase E lands | Plan material-clone migration NOW; flag every shared material |
| B (raycasting + tooltips) | Raycaster perf, hover flicker, frustum | Per-frame raycast, double-listed parts, tooltip flicker on edges | CRIT-5, MOD-11, MOD-12 |
| C (Zustand store) | Store/scene boundary | Double source of truth, subscriber leaks, race on rapid clicks | CRIT-7, CRIT-8, MOD-1 |
| D (procedure engine) | validateStep correctness | Stale closures, hard-coded step indices, English ids leaking into UI | CRIT-2, CRIT-3, MOD-3, MOD-7 |
| E (highlights + visual feedback) | Materials, color encoding, postprocessing | Shared material bug, color-only feedback, GC churn from pulse | CRIT-4, CRIT-6, MOD-10, MOD-13 |
| F (scoring + JSON/PDF) | Localization, persistence, retry abuse | Polish diacritics in PDF, plurals, localStorage schema, retry gaming | MOD-4, MOD-5, MOD-2, MOD-8; CRIT-1 (PDF disclaimer) |
| G (educational layer: free roam, exploded view) | Tween management, pedagogy | Tween stacking, students memorizing simulator | MOD-9, MOD-7 |
| H (testing) | Vitest + Three.js + jsdom | WebGL not in jsdom, mocking THREE classes | MOD-6, MIN-7 |

---

## Cross-Cutting Anti-Patterns (Worth Their Own Section)

These don't map to a single pitfall — they're patterns that, if adopted early, prevent multiple bugs above:

1. **One-way data flow store → scene**, never scene → store except via explicit user-action handlers. Prevents CRIT-7, makes CRIT-8 easy to reason about, makes Phase H testable.
2. **String ids for everything user-visible** (parts, steps, SOPs). Indices are render-only. Prevents CRIT-3, MOD-3.
3. **Pure functions for all logic** (validator, scoring, slider-crank kinematics). Prevents CRIT-2, makes MOD-6 livable.
4. **`dispose()` method on every class with subscriptions, materials, or tweens.** Prevents MOD-1, MOD-9, and the cloned-material leak under CRIT-6.
5. **Polish-only-but-i18n-shaped**: even though we don't ship translations, structure strings as if we did. Prevents MOD-3, eases future EN/DE port.
6. **Disclaimer copy is part of the product, not a footnote.** Prevents CRIT-1 from being "added later" (it never gets added later).

---

## What This Document Does NOT Cover (Out of Scope or Lower Priority)

- **Detailed Polish BHP regulatory specifics** — the disclaimer wording in CRIT-1 is a starting point. Recommend legal/BHP-officer review before production deploy. Confidence on exact phrasing: LOW.
- **VR/AR ergonomics** — out of scope per PROJECT.md.
- **Multi-user / instructor dashboard concerns** — out of scope per PROJECT.md.
- **CSP / security headers** — low risk per CONCERNS.md security notes.
- **Mobile / touch interaction pitfalls** — desktop-first per PROJECT.md.

---

## Sources

**Three.js performance and pitfalls:**
- [Three.js raycaster performance issue #16153](https://github.com/mrdoob/three.js/issues/16153) — performance drops with many meshes (HIGH)
- [Three.js discourse — significant raycaster performance drop](https://discourse.threejs.org/t/significant-performance-drop-with-raycaster/53622) (HIGH)
- [Three.js issue #12857 — spatial search trees feature request](https://github.com/mrdoob/three.js/issues/12857) (HIGH)
- [Three.js inconsistent raycaster intersectObjects results](https://discourse.threejs.org/t/inconsistent-raycaster-intersectobjects-results/57157) (HIGH)
- [Discover Three.js — Tips and Tricks](https://discoverthreejs.com/tips-and-tricks/) — material/texture disposal patterns (HIGH)
- [Roger Chi — Tips on preventing memory leak in Three.js scene](https://roger-chi.vercel.app/blog/tips-on-preventing-memory-leak-in-threejs-scene) (MEDIUM)
- [Mindful Chase — Fixing performance drops and memory leaks in Three.js](https://www.mindfulchase.com/explore/troubleshooting-tips/frameworks-and-libraries/fixing-performance-drops-and-memory-leaks-in-three-js-applications.html) (MEDIUM)

**Zustand vanilla:**
- [Zustand discussion #2054 — ESModule subscriber memory leak](https://github.com/pmndrs/zustand/discussions/2054) (HIGH)
- [Zustand discussion #3061 — proposal for cleanup function in subscribe](https://github.com/pmndrs/zustand/discussions/3061) (HIGH)
- [Zustand npm](https://www.npmjs.com/package/zustand) (HIGH)

**Vitest + WebGL testing:**
- [Three.js issue #17752 — mocking WebGLRenderer with Jest/Vitest](https://github.com/mrdoob/three.js/issues/17752) (HIGH)
- [Three.js discourse — How to unit test Three.js](https://discourse.threejs.org/t/how-to-unit-test-three-js/57736) (HIGH)
- [Three.js discourse — headless-gl WebGL2 limitations](https://discourse.threejs.org/t/suggestions-for-unit-testing-with-headless-gl-and-webgl-2/66891) (HIGH)
- [webgl-mock-threejs](https://github.com/Namamono1129/webgl-mock-threejs) (MEDIUM)
- [Vitest test environment docs](https://vitest.dev/guide/environment) (HIGH)

**jsPDF / Polish diacritics:**
- [jsPDF issue #12 — UTF-8 support](https://github.com/parallax/jsPDF/issues/12) (HIGH)
- [Enabling UTF-8 Support in jsPDF](https://copyprogramming.com/howto/how-to-enable-utf-8-in-jspdf-library) (HIGH)
- [jspdf-customfonts](https://www.npmjs.com/package/jspdf-customfonts) (MEDIUM)

**Safety training pedagogy and gamification:**
- [PubMed — Gamification using technologies for occupational safety](https://pubmed.ncbi.nlm.nih.gov/37742676/) (HIGH — peer-reviewed)
- [Wiley — Gamification for Wildfire Education systematic review](https://onlinelibrary.wiley.com/doi/10.1111/jcal.70108) (HIGH — peer-reviewed)
- [Smartico — Gamification in Health and Safety pitfalls](https://www.smartico.ai/blog-post/gamification-in-health-safety) (MEDIUM — vendor blog but pitfalls are sound)
- [MDPI — Innovating Occupational Safety Training scoping review](https://www.mdpi.com/1660-4601/18/4/1868) (HIGH — peer-reviewed)
- [Springer — Gamification for Immersive Hazard Identification in Construction](https://link.springer.com/chapter/10.1007/978-3-031-84224-5_24) (HIGH — peer-reviewed)

**Industrial training simulators (liability framing):**
- [Nirtec — Why simulation is reshaping industrial automation training](https://www.nirtec.com/blog/industrial-automation-training/) (LOW — vendor)
- [Altoura — Immersive training meeting worker safety](https://www.altoura.com/blog/immersive-training-is-a-game-changer-for-industrial-companies-aiming-to-meet-worker-safety-requirements) (LOW — vendor)
- *Note: Polish-jurisdiction-specific BHP disclaimer language was not deeply researched. Recommend BHP-officer review of CRIT-1 wording before deploy.*

**Internal references (project context):**
- `C:\Users\mparol\Desktop\Dokumenty\Projekty\HydraulicPress\.planning\PROJECT.md`
- `C:\Users\mparol\Desktop\Dokumenty\Projekty\HydraulicPress\.planning\codebase\CONCERNS.md`
- `C:\Users\mparol\Desktop\Dokumenty\Projekty\HydraulicPress\.planning\codebase\ARCHITECTURE.md`

---

*Pitfalls research: 2026-05-05*
