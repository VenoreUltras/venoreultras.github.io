# Codebase Concerns

**Analysis Date:** 2026-05-20

Audyt PM-300 Trener (Three.js + Vite + vanilla JS, post-Phase 4). Codebase jest w znacznie lepszej formie niż sugeruje briefing — większość "tradycyjnych" debt itemów (lint/test/structure) zostało już zaadresowanych. Poniżej rzeczywiste, zweryfikowane w kodzie zagadnienia.

## Tech Debt

### Vite scaffolding leftover — `src/counter.js`

- Issue: brief sugerował obecność leftovera Vite z `setupCounter`.
- Files: `src/counter.js`
- Status: **ZWERYFIKOWANO — plik NIE istnieje**. `find src/ -name counter.js` zwraca pusty wynik; `src/main.js` go nie importuje. Concern nieaktualny — można skreślić z listy follow-upów.
- Impact: brak.

### Dwa `style.css` — root vs `src/` — w tej chwili zachowany jest tylko root

- Issue: brief ostrzegał o niejasnym ownershipie root + `src/style.css`.
- Files: `style.css` (root, 494 linii), brak `src/style.css`.
- Status: **`src/style.css` NIE istnieje**. `index.html` linia 9 ładuje `/style.css` (root), `src/main.js` linia 1 zawiera komentarz: *"root style.css jest jedynym source of truth (Phase Z hygiene)"* — i NIE importuje stylu (import został usunięty). Source-of-truth jest jednoznaczne.
- Pozostały risk: komentarz "Phase Z hygiene" sugeruje, że ktoś mógłby przywrócić import `./style.css` w `main.js` przez nieuwagę → wtedy Vite szukałby pliku, którego nie ma → build failure. Niski priorytet — wystarczy zachować obecny komentarz.

### `PressModel.js` jest długi i monolityczny (859 linii)

- Issue: jeden plik buduje 15 interactable meshów (`_buildFlywheel`, `_buildBrake`, `_buildOilSightGlass`, `_buildRearGuard`, `_buildLightCurtain`, `_buildNameplate`, `_buildSafetyPanel`, `_buildEStop`, `_buildFrontGuard`, `_buildMainSwitch`, `_buildClutchLever` …) plus zarządza pose'ami ruchomych części.
- Files: `src/PressModel.js`
- Impact: każda zmiana geometrii dotyka tego samego pliku — wysokie ryzyko merge-conflict gdy kilka osób pracuje równocześnie nad częściami sceny. Plik jest poza coverage thresholdami (`vitest.config.js` linie 17 obejmuje tylko `src/training/**` i `src/state/**`) — testowane wyłącznie przez `tests/PressModel.smoke.test.js`.
- Fix approach: rozbić `_build*` na moduły `src/press/parts/*.js` (jeden mesh per plik), `PressModel.js` staje się wyłącznie kompozytorem. Każdy `_build*` można testować izolowanie. Bez urgentnej potrzeby — refactor "gdy pojawi się druga osoba pracująca nad sceną równolegle".

### Hardcoded parametry geometrii w `PressModel`

- Issue: `this.r = 0.8`, `this.l = 4.0`, `this.shaftY = 8.0` to magiczne literały w konstruktorze; identyczne wartości wpisane też w `index.html` jako tekst (`<li>Skok suwaka (2r): 1.6 m</li>`, linia 51) i w komentarzach.
- Files: `src/PressModel.js:19-21`, `index.html:51-52`
- Impact: zmiana stroku/długości korbowodu wymaga edycji w dwóch miejscach (geometria + tekst panelu informacyjnego). Brak single source — risk desync.
- Fix approach: wynieść do `src/pressConstants.js` (lub `pl.js` jako stringi sformatowane runtime), `UI.updateTelemetry` lub `StatusPanel` renderuje tekst z konstanty.

### Slider RPM tor żyje równolegle do `machineState` w storze

- Issue: `UI.isRunning` (toggle button `#btn-toggle`) jest ortogonalny do `store.machineState`. Komentarz w `src/UI.js:1-4` i `src/main.js:84` explicit przyznaje: *"Slider RPM tor (this.isRunning + getAngularVelocity()) zostaje — to ortogonalny kanał kontroli obrotu wału, niezależny od machineState w storze (D-Phase4-17)"*.
- Files: `src/UI.js:21`, `src/UI.js:30-32`, `src/main.js:92-95`
- Impact: dwa źródła prawdy o "czy maszyna pracuje" — `UI.isRunning` decyduje czy GSAP-tick integruje kąt, `store.machineState` decyduje czy `StatusPanel` pokazuje "gotowa-do-pracy" / "w-cyklu" / itd. Mogą się rozjechać — można kliknąć Start gdy `machineState === 'awaria'` i wał się kręci, gdy semantycznie nie powinien.
- Fix approach: docelowo `UI.isRunning` powinno być pochodną `machineState === 'w-cyklu'` lub być promowane do storu jako `isShaftRotating`. Phase 5/6 candidate — wpisać w roadmap.

### `Application._unsubscribers` jest pusty

- Issue: `src/main.js:38-40` deklaruje `this._unsubscribers = []` z komentarzem *"capture każde unsubscribe handle, zwalniane w dispose()"*, ale żaden konstruktor nic do tej tablicy nie pushuje (subskrybenci żyją w `StatusPanel`/`StepPanel`/`HighlightManager` i każdy z nich ma własny `_unsubscribers` zwalniany przez `dispose()`).
- Files: `src/main.js:40`, `src/main.js:122-123`
- Impact: martwy kod / mylący placeholder. Pętla `for (const unsub of this._unsubscribers) unsub();` w `dispose()` jest no-opem. Nie szkodzi, ale wprowadza zamieszanie ("dlaczego tu nic nie ma?").
- Fix approach: usunąć pole + pętlę, albo udokumentować, że trzymane jest na wypadek, gdy `Application` doda własną subskrypcję spoza paneli.

### `case 'playAudio'` to NO-OP

- Issue: `src/state/trainingStore.js:142-144` zawiera placeholder pod Phase 5. `ProcedureEngine` może emitować `playAudio` effect, ale store go po cichu połyka.
- Files: `src/state/trainingStore.js:142`
- Impact: scenariusze które polegają na audio feedback (Phase 5+) nie dostaną dźwięku. W obecnej Phase 4 nieaktywne — żaden scenariusz nie używa.
- Fix approach: kiedy Phase 5 wejdzie, podpiąć tu `AudioController` przez DI (analog `scheduleTimer`).

### Silent catch w `evaluateFaultRulesData`

- Issue: `src/training/faultRules.js:46-55` — predykat `rule.when(state)` opakowany try/catch, ale `catch {}` jest pusty. Komentarz: *"W produkcji loguje console.warn (dev) — w Phase 1 silently skip"*. Phase 1 dawno minęła.
- Files: `src/training/faultRules.js:52-55`
- Impact: błędna reguła BHP (np. typo w `state.meshStates?.['oslona-przedna']`) nie failuje nigdy — silnik scoringu nadal działa, ale walidacja BHP nie strzela. Bardzo niemiła kategoria buga, bo użytkownik dostaje zielone "wynik 100/100" przy realnym naruszeniu.
- Fix approach: w trybie dev (`import.meta.env.DEV`) wypisywać `console.warn('faultRule threw', rule.id, e)`. Można też dodać `tests/faultRules.test.js` test, że żadna reguła nie rzuca na kanonicznych snapshotach state'a.

## Known Bugs

Brak znanych bugów w aktualnym kodzie. Wszystkie scenariusze edge przewidziane w `RaycastController` (`isAnimating` lock, hover hysteresis, click-vs-drag <5px), `EmissiveController` (priority stack hover/state), `SceneSetup` (WebGL context-loss handling) mają explicit testy w `tests/`.

Najbliższy "potencjalny" obszar: `_pendingCount--` w `RaycastController._runHysteresis` linia 85 — gdy pointer stoi (no-move) wokół committed targetu, licznik leci poniżej zera i `<=0` → `_commitLeave`. Komentarz mówi *"sprawdzamy stale leave"*, ale brak testu, który sprawdza, że kursor stojący nieruchomo nad meshem NIE zgubi hover po N tickach. Verification gap, nie bug.

## Security Considerations

### `innerHTML` jako statyczny szablon

- Risk: w teorii XSS gdyby template zawierał interpolację user inputu.
- Files: `src/DisclaimerBanner.js:51-63`, `src/ui/StatusPanel.js:60-67`
- Current mitigation: oba miejsca używają **template literals BEZ interpolacji** (tylko literały HTML kompile-time-known). Dynamic content (`pl.disclaimer.full`, `s.scoring.score`, `pl.machineState[stateKey]`) idzie wyłącznie przez `textContent`. Komentarze przy każdym `innerHTML` explicit zaznaczają XSS-safe rationale. Defense-in-depth jest na miejscu.
- Recommendations: utrzymać hard rule "innerHTML tylko z literałem statycznym; cała dynamika przez textContent". Można dodać eslint rule (po wprowadzeniu lintera — patrz niżej) `no-unsanitized/property` jeśli kiedyś będzie ESLint.

### `localStorage` bez sanityzacji wartości

- Risk: użytkownik może ręcznie ustawić `localStorage.setItem('pm300:hc-outline:v1', 'cokolwiek')`; kod czyta `=== 'true'` więc wszystko inne degraduje do `false`. Bezpieczne.
- Files: `src/main.js:44-47`, `src/DisclaimerBanner.js:90-104`, `src/ui/StatusPanel.js:44-52`
- Current mitigation: try/catch wokół wszystkich `localStorage.get/setItem` (private mode / quota); explicit equality check zamiast truthy.
- Recommendations: status OK — pattern powtórzony konsekwentnie. Można rozważyć abstrakcję `safeLocalStorage` jeśli pojawi się 4. miejsce z tym wzorcem.

### Brak CSP / SRI

- Risk: `index.html:8` ładuje Google Fonts bez integrity hash; nie ma `Content-Security-Policy` meta.
- Impact: low w trybie dev/demo; istotne gdyby projekt szedł na produkcję dla szkoleń. CDN compromise → injected JS.
- Recommendations: dla Phase 6/produkcji dodać CSP meta + rozważyć self-hosting fontów. Out-of-scope w Phase 4.

## Performance Bottlenecks

### GSAP ticker jako jedyne źródło timingu

- Problem: brief flagował to jako concern. Praktycznie: cały timing (sim tick, raycast hysteresis, GSAP animacje emissive) idzie przez `gsap.ticker`. Jeśli GSAP się crashuje / loaduje z opóźnieniem → cały loop stoi.
- Files: `src/main.js:30-37`, `src/SceneSetup.js:46-52`
- Cause: design decision (D-Phase4-* / SCENE-01). GSAP `ticker.sleep()` jest też wpięte w `webglcontextlost` (`src/SceneSetup.js:46-48`) — celowe pause przy utracie WebGL.
- Improvement path: NIE wymaga zmiany — pin `gsap ~3.15.0` w `package.json` (komentarz `src/main.js:90` "INFRA-03 kontrakt zablokowany") zabezpiecza przed regresją API. Risk = zerwanie pin'a w przyszłej aktualizacji deps. Mitigation: keep version pinned, dodać test sprawdzający `typeof gsap.ticker.add === 'function'`.

### `intersectObjects` na wszystkich interactables każdy tick (przy pointermove)

- Problem: `src/RaycastController.js:92-93` woła `raycaster.intersectObjects(this._meshes, false)` raz na tick gdy `_pointerDirty`. `this._meshes` to 15 meshów. Przy 60Hz to 900 testów AABB/triangle per sekundę.
- Files: `src/RaycastController.js:38-39`, `src/RaycastController.js:92-93`
- Cause: brak BVH / spatial index. Throttling jest już zaimplementowane (dirty flag → max 1 raycast/tick), więc actual cost jest umiarkowany.
- Improvement path: dla obecnych 15 meshów nie wymaga optymalizacji. Jeśli scena urośnie do 50+ interactable → rozważyć `three-mesh-bvh`. Niski priorytet.

### Brak pre-alokacji `THREE.Vector3` w hot path-ach (oprócz `_pinPosition`)

- Status: częściowo zaadresowane. `src/PressModel.js:25` `this._pinPosition = new THREE.Vector3()` — reused per-frame. `src/RaycastController.js:39` `this._ndc = new THREE.Vector2()` — reused per-event.
- Pozostały risk: niski. GC pressure w sim loop jest minimalny.

## Fragile Areas

### `PressModel.update(angle)` — pivot math zależny od dziedziczonej hierarchii grup

- Files: `src/PressModel.js` (cała `buildPress` + `update`)
- Why fragile: kombinacja `shaftAxis` (group rotating around X), `eccentricPin` (child Object3D sampled via `getWorldPosition`), `rod` (cylinder pre-translated by `-l/2` so origin = pivot point), i `slider` (Y-only). Każda zmiana w hierarchii grup wymaga ponownego przeliczenia trygonometrii w `update()`. Komentarze i `CLAUDE.md §"3D scene composition"` ostrzegają o tym jako "Just Works because pre-translate".
- Safe modification: NIE zmieniaj kolejności `add()` w `buildPress()`. NIE usuwaj `rodMeshGeo.translate(0, -this.l / 2, 0)` (linia 130) — bez tego origin rod'a wraca do środka geometrii i `atan2` lookup pivota się rozsypuje. `tests/PressModel.smoke.test.js` jest smoke-only, więc takie regresje przejdą tests.
- Test coverage: brak testu integration sprawdzającego pozycję `eccentricPin.getWorldPosition()` dla angle = 0/π/2/π. Można dodać do `tests/physicsEngine.test.js` companion test, który manualnie wykonuje `pressModel.update(angle)` i sprawdza Y suwaka === wartości `PhysicsEngine.calculateSliderPosition`.

### Subscriber priority i side-effects ordering w `Application`

- Files: `src/main.js:53-87` (konstrukcja w określonej kolejności), `src/main.js:120-133` (dispose w odwrotnej)
- Why fragile: explicit komentarze D-Phase4-14 / T-04-14 wskazują, że `EmissiveController` MUSI istnieć gdy `RaycastController.dispose()` woła `_commitLeave()`. Ta kolejność dispose jest udokumentowana, ale enforce'owana wyłącznie przez review — brak testu sprawdzającego, że refaktor `dispose()` nie zamieni kolejności.
- Safe modification: nie reorderuj `dispose()` calli w `src/main.js:120-133`. Jeśli musisz, najpierw przeczytaj komentarz blokowy linii 110-119.
- Test coverage: `tests/application.test.js` istnieje — sprawdzić, czy weryfikuje kolejność dispose. Jeśli nie, dodać assertion że `emissiveController.dispose` jest wywołane po `raycastController.dispose`.

### `_meshes = Array.from(interactables.values())` — snapshot tylko w ctor

- Files: `src/RaycastController.js:34`, `src/highlight/EmissiveController.js:35`
- Why fragile: oba kontrolery cache'ują snapshot listy interactables raz w konstruktorze (zero alokacji per-tick). Jeśli kiedyś `PressModel` dorzuci interactable dynamicznie post-mount (np. dla scenariusza, który ujawnia nowy element), to nowy mesh NIE pojawi się w raycaście/emissive.
- Impact: dziś nie problem (wszystkie interactables tworzone w `buildPress` przed Application ctor), ale design constraint, który trzeba udokumentować.
- Safe modification: jeśli kiedykolwiek będzie dynamiczne dodawanie meshów, trzeba dodać metodę `RaycastController.refreshMeshes()` / `EmissiveController.refreshMeshes()`. Dziś — nie ruszać.

## Scaling Limits

### Liczba interactables w hover/raycast

- Current capacity: 15 meshów (komentarz `MaterialRegistry.size()` smoke test).
- Limit: realistycznie 100-200 przed potrzebą BVH (tysiące triangli per intersect).
- Scaling path: `three-mesh-bvh` package + zmiana `intersectObjects` na BVH-accelerated.

### Liczba scenariuszy w `pl.js` translations

- Files: `src/i18n/pl.js` (162 linie obecnie)
- Limit: wszystkie polskie stringi w jednym module. Przy >10 scenariuszy będzie hard-to-navigate.
- Scaling path: rozbić na `src/i18n/pl/disclaimer.js`, `src/i18n/pl/machineState.js`, `src/i18n/pl/scenarios/*.js` z barrel re-exportem.

### Liczba reguł BHP w `faultRules.js`

- Current: 1 reguła (`oslona-otwarta-w-cyklu`).
- Limit: lista linear-scanned per `attemptStep` w `evaluateFaultRulesData`. Przy 50+ regułach (po expert review BHP) trzeba indexować po `state.machineState`.
- Scaling path: pre-group rules by predicate signature; lazy evaluation.

## Dependencies at Risk

### `gsap ~3.15.0` — pin tilde, nie caret

- Files: `package.json:21`
- Risk: minor — `~3.15.0` pozwala patch ale nie minor bump. `gsap.ticker` API jest udokumentowanym kontraktem (`src/main.js:90` "INFRA-03 kontrakt zablokowany ~3.15.0").
- Impact: jeśli GSAP 4.x kiedyś wyjdzie i zmieni signature `ticker.add(callback)` lub format `deltaTime` (ms vs s) — sim loop się rozsypie.
- Migration plan: hold-out, manual upgrade z test sweep przy major bump.

### `zustand ^5.0.13`

- Files: `package.json:23`
- Risk: caret — minor bumps automatic. Zustand 5.x stabilne, ale `subscribeWithSelector` middleware API mógłby się zmienić.
- Impact: cała subskrypcyjna ścieżka (`StatusPanel`, `StepPanel`, `HighlightManager`, `EdgeOutlineController`) zależy od `store.subscribe(selector, callback)` signature.
- Migration plan: pin do `~5.0.x` rozważyć; obecnie OK.

### `three ^0.184.0` z caret

- Files: `package.json:22`
- Risk: Three.js wprowadza breaking changes between minor releases (np. shadow API, material defaults). Caret automatic.
- Impact: per-mesh material clones, emissive setHex, OrbitControls API — wszystko vulnerable.
- Migration plan: rozważyć tilde pin. Każdy minor bump wymaga ręcznego sweep'u `tests/PressModel.smoke.test.js` + visual regression.

## Missing Critical Features

### Brak lintera / formattera

- Problem: nie ma `.eslintrc*`, `eslint.config.*`, `.prettierrc*`. `package.json:scripts` nie ma `lint`.
- Blocks: catch przed-runtime rule violations (no-unused-vars, no-undef, importy z forbidden modules). Boundaries enforced przez `tests/boundaries.test.js` (statyczna analiza w teście), ale tylko wybrane pary plików — szersze rules (unused imports, dead exports) nie są pokryte.
- Recommendation: dodać ESLint + flat config + `eslint-plugin-import` (no-cycle, no-unused-modules). Niski wysiłek, wysoki ROI. Można też reuse'ować scanner z `tests/boundaries.test.js` jako custom eslint rule.

### Brak `lint-staged` / pre-commit hook

- Problem: brak `.husky/`, `lint-staged` w `package.json`.
- Blocks: PR-time enforcement formatu i testów. Obecnie polega na CI (jeśli istnieje — brak `.github/workflows/`).
- Recommendation: po dodaniu ESLint, dodać `husky + lint-staged + npm test` pre-commit.

### Brak CI workflow

- Problem: nie zauważyłem `.github/workflows/` ani konfiguracji innego CI.
- Blocks: `tests/boundaries.test.js` + `tests/*.test.js` jest cennym safety net, ale nie blokuje PR jeśli developer zapomni `npm test`. Vitest coverage thresholds (lines:95, functions:95, branches:90, statements:95 w `vitest.config.js`) failuje lokalnie, ale CI red nie ma.
- Recommendation: prosty `.github/workflows/test.yml` z `npm ci && npm test` na PR i push.

## Test Coverage Gaps

### `PressModel` poza coverage thresholds

- What's not tested: `vitest.config.js:17` `include: ['src/training/**', 'src/state/**']` — `PressModel.js`, `SceneSetup.js`, `UI.js`, `MaterialRegistry.js`, `RaycastController.js`, `highlight/*`, `ui/*` NIE są wliczone do thresholdów coverage. Mają tylko smoke testy.
- Files: `tests/PressModel.smoke.test.js`, `tests/MaterialRegistry.smoke.test.js`
- Risk: regresje w geometrii / pivot math nie zostaną złapane przez coverage gate. `PressModel.update(angle)` ma 0 unit testów, mimo że jest hot path symulacji.
- Priority: medium. Coverage scope expansion + dedykowany `tests/pressModel.update.test.js`.

### Brak testu odwrotnej kolejności dispose

- What's not tested: kolejność dispose w `Application.dispose()` (T-04-14: RaycastController PRZED EmissiveController).
- Files: `src/main.js:120-133`, `tests/application.test.js`
- Risk: refaktor `dispose()` zamieni kolejność → `_commitLeave` woła `emissive.clearLayer` na disposed controllerze → throw. Test integracyjny powinien spy'ować obie metody i sprawdzać kolejność wywołań.
- Priority: medium.

### Brak testu silent-catch w `faultRules`

- What's not tested: błędna reguła BHP (predicate rzucający) jest cicho połykany. Nie ma testu, który by failował, gdyby reguła rzuciła.
- Files: `src/training/faultRules.js:52-55`
- Risk: developer wprowadza typo w `state.meshStates?.['oslona-przedna']` → reguła wywala się → user dostaje 100/100 przy realnym naruszeniu BHP → false success.
- Priority: high (safety-critical domain). Dodać assertion w `tests/faultRules.test.js` że żaden `rule.when(snapshot)` nie rzuca dla zestawu typowych state snapshots, plus dodać `console.warn` w dev mode dla obecnej silent-catch.

### Brak visual regression testów

- What's not tested: nic nie chroni przed regresjami wizualnymi sceny 3D (pozycje meshów, materiały, oświetlenie). Smoke testy sprawdzają tylko liczbę meshów / registry size / interactable IDs.
- Risk: zmiana w `buildPress` która przesunie slider/eccentric nie zostanie złapana.
- Priority: low-medium. Visual regression jest kosztowny (snapshot pixels). Tańsza alternatywa: position-snapshot testy (assertion na `mesh.position.toArray()` dla każdego interactable po `buildPress()`).

---

*Concerns audit: 2026-05-20*
