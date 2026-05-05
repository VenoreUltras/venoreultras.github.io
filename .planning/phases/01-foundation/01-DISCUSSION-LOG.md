# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-05
**Phase:** 1-Foundation
**Areas discussed:** Schemat scenariusza JSON, Lista kroków 'uruchomienie', Disclaimer banner, Formuła scoringu

---

## Schemat scenariusza JSON

### Q1: Jak zapisywać kolejność/warunki wstępne kroków?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Niejawna kolejność tablicy (rekomendacja) | Silnik trzyma `currentStepId`, akceptuje tylko następny krok. Najprostsze i najsurowsze. | ✓ |
| Jawne `requires:[stepIds]` | Każdy krok wymienia prerekwizyty; pozwala na równoległość. | |
| Hybryda: fazy równoległe + sekwencyjne | Fazy z `order: any/strict`; modeluje rzeczywistość hali. | |

**User's choice:** Niejawna kolejność tablicy
**Notes:** Pasuje do filozofii „uczeń ma poznać każdy krok w kolejności" — strict SOP teaching.

---

### Q2: Skąd biorą się `effects[]` zwracane przez `validateStep`?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Zadeklarowane w JSON jako lista typowanych akcji (rekomendacja) | `effectsOnSuccess[]` + `effectsOnError[]` w każdym kroku; closed type set. | ✓ |
| Generowane przez silnik na podstawie `kind` | Krótszy JSON, mniej elastyczne (każdy `manipulation` robi to samo). | |
| Wolnostojące łatki stanu (state patches) | Najbardziej generyczne; JSON musi znać layout store'a. | |

**User's choice:** Zadeklarowane w JSON jako lista typowanych akcji
**Notes:** Closed type set v1: `setMachineState`, `setMeshState`, `appendEvent`, `playAudio`, `startSpinUpTimer`.

---

### Q3: Gdzie żyją reguły fault?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Globalne invariants w osobnym module (rekomendacja) | `src/training/faultRules.js` — cross-scenario, brak duplikacji. | ✓ |
| Per scenariusz, inline w JSON | Pełna deklaratywność, ale duplikacja, ryzyko desync. | |
| Hybryda: globalne core + per-scenario extensions | Best of both, więcej kodu w silniku. | |

**User's choice:** Globalne invariants w osobnym module
**Notes:** `when:(state)=>bool` to funkcja JS (nie JSON) — to OK, faultRules.js żyje w JS module, nie w deklaratywnym scenariuszu JSON. Engine: `evaluateFaultRules(state)` po każdym effects-applied.

---

### Q4: Gdzie żyją polskie komunikaty błędów i `rationale`?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Inline w scenariuszu JSON (rekomendacja) | `labelPL`, `descriptionPL`, `rationalePL` przy kroku; `errorCode` → mapa w pl.js. | ✓ |
| Wszystkie teksty PL przez klucze w `pl.js` | Maksymalna centralizacja; edycja procedury wymaga 2 plików. | |

**User's choice:** Inline w scenariuszu JSON
**Notes:** Trener/ekspert BHP edytuje jeden plik `uruchomienie.json` żeby zmienić procedurę + jej teksty. `pl.js` zostaje krótkie (errors + UI strings + disclaimer).

---

## Lista kroków 'uruchomienie'

### Q5: Która lista kroków jest poprawna z punktu widzenia BHP?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| 7 kroków — z testem oburecznego (rekomendacja) | Plus weryfikacja panelu oburecznego przed sprzęgnięciem. | |
| 6 kroków — minimum z roadmapy | Strict per PROJECT.md/ROADMAP.md; test oburecznego w Phase 6 (cykl pracy). | |
| 8 kroków — z identyfikacją maszyny i kontrolą narzędzia | Sprawdzenie tabliczki + osobno narzędzie tnące. | ✓ |

**User's choice:** 8 kroków
**Notes:** Najpełniejsze dydaktycznie. `sprawdz-tabliczke` (visual-target → tabliczka znamionowa) + `kontrola-narzedzia` (visual-attest, czysty checkbox) + 6 z minimum.

---

### Q6: Jak modelujemy „sprzęgnij dopiero po nabraniu obrotów"?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Stan + wewnętrzny timer rozpędu (rekomendacja) | `setMachineState 'rozpedzanie'` + 3000ms timer → `gotowa-do-pracy`. Vitest: fake timers. | ✓ |
| Osobny krok `czekaj-na-rozped` (kind: 'wait') | Eksplicytny 9. krok; nowy `kind: wait` w schemacie. | |
| Pominąć modelowanie rozpędu w v1 | Sprzęgnięcie zaraz po włączeniu; mniej realizmu. | |

**User's choice:** Stan + wewnętrzny timer rozpędu
**Notes:** Phase 5 audio (EDU-03 szum koła zamachowego proporcjonalny do RPM) wymaga tego stanu. Klik sprzęgła wcześniej → `errorCode: 'E-SPRZEGNIETO-PRZED-ROZPEDEM'`, severity critical.

---

### Q7: Czy każdy krok `visual` musi mieć `targetMeshId`?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Dwa podtypy: `visual-target` i `visual-attest` (rekomendacja) | Eksplicytna różnica; schema enforce'uje. | ✓ |
| Jeden `visual` z opcjonalnym `targetMeshId` | Mniej typów, warunkowe pole. | |
| Wszystkie visual to czyste checkboxy bez 3D-target | Najprostsze; traci dydaktyczne „kliknij wziernik". | |

**User's choice:** Dwa podtypy `visual-target` / `visual-attest`
**Notes:** `manipulation` + `visual-target` + `visual-attest` = trzy `kind` w v1. `targetMeshId` required dla pierwszych dwóch, zabronione dla `visual-attest`.

---

### Q8: Stan `rozpedzanie` — jak go zmieścić?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Dodać 7. stan `Rozpędzanie` do UI-02 (rekomendacja) | Pełnoprawny stan; wymaga edycji REQUIREMENTS.md UI-02 + ROADMAP.md Phase 4 SC3. | ✓ |
| Substate w osobnym slice (`spinUpProgress`) | machineState 6-wartościowe; nie ruszamy locked requirementów, ale luzny enum. | |

**User's choice:** Dodać 7. stan
**Notes:** Polska etykieta: `Rozpędzanie...` (z trzema kropkami). Edycja REQUIREMENTS/ROADMAP/PROJECT zaplanowana jako część Phase 1.

---

## Disclaimer banner

### Q9: Jaka kopia v1 (placeholder do późniejszego review BHP)?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Krótka belka jednolinijkowa (rekomendacja) | Zwięzłe, mieści się w top-barze, łatwo cytowalne w PDF. | ✓ |
| Dwuzdaniowa z kontekstem prawnym | Plus CIOP-PIB/PIP; może wymagać 2 linii. | |
| Trójzdaniowa z podpisem 'Raport, nie certyfikat' | Najmocniejsza prawnie; może wymagać modal/expandable. | |

**User's choice:** Krótka belka jednolinijkowa
**Notes:** „Symulator szkoleniowy — NIE zastępuje obowiązkowego szkolenia BHP ani instruktażu stanowiskowego." Po review BHP-officer można rozszerzyć kopię — miejsce w `pl.disclaimer.full`.

---

### Q10: Czy disclaimer jest dismissable?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Zawsze widoczny, niedismissable (rekomendacja) | Brak X, brak storage'a. Wprost zgodne z UI-05. | |
| Modal na pierwszym loadzie + sticky banner zawsze | Eksplicytna akceptacja w localStorage; więcej kodu. | |
| Sticky banner z minimalize (collapsible) | Zwijany do paska 1px z ikoną `!`; lekka frykcja. | ✓ |

**User's choice:** Sticky banner z minimalize (collapsible)
**Notes:** Interpretacja UI-05 „widoczny stale" → ikona `!` zawsze obecna w viewport. Stan persistowany w localStorage `pm300:disclaimer:collapsed:v1`. Aria-button + aria-expanded.

---

### Q11: Pozycja banera w layout?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Top bar nad całym layoutem (rekomendacja) | Sticky u góry; pierwsze co kursant widzi. | ✓ |
| Footer pod całym layoutem | Lustrzane do PDF; mniej rzucające się w oczy. | |
| Floating w rogu (top-right) | Nie zabiera szerokości; mniej formalne. | |

**User's choice:** Top bar nad całym layoutem
**Notes:** Daje pierwszeństwo informacyjne. Pasuje do konwencji ostrzeżeń w aplikacjach przemysłowych.

---

### Q12: Skąd Phase 6 PDF bierze tekst disclaimera?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Single source of truth w `pl.js` (rekomendacja) | `pl.disclaimer.full` + `pl.disclaimer.short`; banner i PDF czytają z jednego miejsca. | ✓ |
| Hardcode w obu miejscach (banner + PDF) | Dwa źródła; ryzyko desync. | |

**User's choice:** Single source of truth w `pl.js`
**Notes:** Jedna edycja po review BHP-officer = jedna zmiana, wszystko zsynchronizowane.

---

## Formuła scoringu

### Q13: Jaki model — odejmowanie od 100 czy dodawanie od 0?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Subtractive od 100 z floor 0 (rekomendacja) | Intuicyjne; floor 0 zatrzymuje akumulację po katastrofie. | ✓ |
| Subtractive od 100 BEZ floor (może ujemny) | Surowe, demotywujące, dziwne w UI/PDF. | |
| Additive od 0 (punkty + kary) | Wymaga zliczania kroków; zmienia strukturę. | |

**User's choice:** Subtractive od 100 z floor 0
**Notes:** `final = max(0, 100 + sum(severity_weights))`. Brak bonusów — ścieżka czysto karna. Pasuje do BHP — nie ma „gorzej niż 0", jest sukces vs porażka.

---

### Q14: Mapowanie typów błędów na klasę severity?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Naruszenia bezpieczeństwa = critical (rekomendacja) | fault rule = critical, sequence = medium, missed visual = minor. | ✓ |
| Wszystko jednolite = medium (uproszczenie v1) | Jedna waga -10; granulacja po review. | |
| Sequence violation = critical (najsurowsze BHP) | sequence + fault rule = critical; brak minor. | |

**User's choice:** Naruszenia bezpieczeństwa = critical
**Notes:** critical (-25): fault rule violations + step.violation severity:'critical' (jak `sprzegnij-po-rozpedzie` przed rozpędem). medium (-10): sequence violation. minor (-2): missed visual w retry. Provisional, czeka na review (STATE.md Q6).

---

### Q15: Format eventu w event logu store'a?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Discriminated union z `type` (rekomendacja) | Zamknięta lista typów; switch w ScoringService; type safety. | ✓ |
| Generic z `type` + `payload` | Krótszy schema, mniej safety. | |
| Flat z opcjonalnymi polami | Łatwy do pisania, dużo undefined-checks. | |

**User's choice:** Discriminated union
**Notes:** Typy: `step.attempted`, `step.done`, `step.violation`, `fault.triggered`, `session.start`, `session.retry`, `session.done`. Każdy ma `timestamp` (ms).

---

### Q16: Czy wagi severity są stałe czy konfigurowalne?

| Opcja | Opis | Wybrana |
|-------|------|---------|
| Konfigurowalne argumentem z domyślnymi w module (rekomendacja) | `calculate(events, opts)` deep-merguje; testy mogą podłożyć inne wagi. | ✓ |
| Stałe wbite w module | Hardkodowane consts; każda zmiana = git commit. | |

**User's choice:** Konfigurowalne argumentem z domyślnymi w module
**Notes:** `src/training/scoringWeights.js` eksportuje `DEFAULT_WEIGHTS`. Po review eksperta = jedna edycja `scoringWeights.js`, brak zmian w `ScoringService`.

---

## Claude's Discretion

Plannerowi zostawione (zob. CONTEXT.md § Claude's Discretion):
- Schema validation scenariuszy (ad-hoc vs zod / JSON Schema)
- `tests/boundaries.test.js` enforcement mechanism (regex / AST / dependency-cruiser)
- TrainingStore slice design (płaski obiekt vs zustand slices)
- WebGL context-loss copy PL (placeholder OK)
- Strategia application timera rozpędu (store / Application / inny moduł)

## Deferred Ideas

- Disclaimer 2/3-zdaniowy z kontekstem prawnym CIOP-PIB/PIP — po review BHP-officer
- Bonus za poprawne kroki w scoringu (additive) — gdyby ekspert zaproponował gamifikację
- Grupowanie kroków w fazy (`phases[]` z `order: any/strict`) — jeśli scenariusz cykl/awaria w Phase 6 wymusi
- `sprawdz-tabliczke` jako element DIFF-02 (v2 randomized faults) — kursant identyfikuje konkretną prasę
- `zod` / JSON Schema validation jeśli scenariusze v2 staną się złożone

