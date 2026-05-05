# PM-300 Trener — Symulator Szkoleniowy Prasy Mimośrodowej

## What This Is

Przeglądarkowy digital twin prasy mimośrodowej PM-300, który uczy operatorów poprawnej procedury obsługi maszyny przez interakcję z modelem 3D. Uczeń przechodzi przez SOP (Standard Operating Procedure) — uruchomienie, cykl pracy, zatrzymanie, reakcja na awarię — klikając rzeczywiste komponenty w scenie i zaznaczając kroki kontrolne na liście. Narzędzie szkoleniowe dla operatorów wewnątrz zakładu, działające w pełni po stronie klienta (bez backendu).

## Core Value

Uczeń, który ukończy sesję szkoleniową w symulatorze, wie w jakiej kolejności i dlaczego wykonuje się każdy krok procedury obsługi prasy mimośrodowej — i nie uruchomi maszyny pomijając krytyczny krok bezpieczeństwa.

## Requirements

### Validated

<!-- Capabilities już obecne w istniejącej bazie kodu PM-300. Nie ruszamy ich w tym milestone-ie chyba że zostaną zinwalidowane. -->

- ✓ Renderowanie sceny 3D z modelem prasy (rama, wał, mimośród, korbowód, suwak) — `src/PressModel.js`, `src/SceneSetup.js`
- ✓ Pętla animacji oparta na GSAP ticker (nie `requestAnimationFrame`) — `src/main.js`
- ✓ Kinematyka slider-crank: `y = r·cos(α) + √(l² − (r·sin(α))²)` — `src/PhysicsEngine.js`
- ✓ Panel boczny w glassmorphism (slider RPM, przycisk Start/Stop, telemetria kąta i przesunięcia) — `src/UI.js`, `style.css`
- ✓ Polski język interfejsu i komentarzy

### Active

<!-- Hipotezy do walidacji przez wdrożenie. -->

- [ ] Pełny digital twin: dodanie koła zamachowego, sprzęgła, hamulca, układu smarowania, osłon bezpieczeństwa, E-stop, panelu sterowania — każde jako osobny, klikalny mesh
- [ ] Raycasting: każdy istotny komponent procedury jest klikalny w przestrzeni 3D
- [ ] System SOP — silnik procedur obsługujący 4 scenariusze v1: **uruchomienie**, **cykl pracy**, **zatrzymanie**, **reakcja na awarię**
- [ ] `validateStep()` — funkcja rygorystycznie sprawdzająca kolejność kroków, blokująca akcje wykonane poza kolejnością
- [ ] Feedback wizualny: pulsujące czerwone podświetlenie pominiętych/błędnych elementów, zielone podświetlenie dla poprawnie wykonanych (emissive material / shader)
- [ ] Hybrydowa interakcja: klik w 3D dla akcji manipulacyjnych (E-stop, osłony, dźwignia sprzęgła) + zaznaczanie checkboxów dla inspekcji wzrokowej (np. "sprawdziłem poziom oleju")
- [ ] Lista kontrolna kroków w panelu bocznym — widoczna instrukcja po polsku, status każdego kroku (oczekuje / aktywny / poprawny / błąd)
- [ ] Status maszyny w czasie rzeczywistym: "Oczekiwanie na inspekcję" / "Gotowa do pracy" / "W cyklu" / "Zatrzymana" / "Awaria — błąd procedury"
- [ ] Warstwa dydaktyczna: tooltipy on-hover (nazwa + funkcja komponentu), tryb wolny (free roam bez procedury), exploded view, krótki opis "o co chodzi w tym kroku"
- [ ] Scoring lokalny: liczba błędów, czas ukończenia, lista pominiętych kroków, zapis w `localStorage`, eksport sesji do JSON i PDF
- [ ] Centralny store stanu szkolenia (Zustand vanilla) — synchronizacja kroków SOP, statusu komponentów 3D, wskaźników UI
- [ ] Testy jednostkowe logiki procedury (Vitest) — kolejność, walidacja, scoring, edge case'y
- [ ] Wszystkie nowe stringi UI, komunikaty błędów, dokumentacja JSDoc — po polsku

### Out of Scope

- **Backend / konta użytkowników** — odbiorca to szkolenie wewnętrzne firmy, dane sesji wystarczy trzymać lokalnie i eksportować ręcznie
- **Tryb instruktora / dashboard brygadzisty** — odłożone do v2 po walidacji formatu pojedynczej sesji
- **Wiele wariantów prasy** — v1 modeluje wyłącznie PM-300; inne maszyny to osobny milestone
- **Aplikacja mobilna / PWA offline** — desktop browser first; mobile może przyjść później
- **Tłumaczenia (EN/DE)** — Polski only, lokalizacja to przyszły milestone
- **Symulacja awarii mechanicznych z fizyką (np. zacięty suwak z naprawdę modelowanym tarciem)** — v1 odgrywa scenariusze awaryjne skryptowo, nie poprzez fizyczną symulację
- **VR / AR** — przeglądarkowy 3D wystarczy dla v1
- **Logowanie po SSO firmowym / LDAP** — nieaplikowalne (brak backendu)

## Context

**Stan istniejący (brownfield):** Repozytorium zawiera działający symulator PM-300 zbudowany na Three.js r0.184 + GSAP 3.15 + Vite 8 (vanilla ES modules, brak frameworka frontendowego). Architektura: cztery klasy (`Application` w `main.js`, `SceneSetup`, `PressModel`, `PhysicsEngine`, `UI`) skoordynowane przez ticker GSAP. Pełna analiza w `.planning/codebase/` (STACK.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, INTEGRATIONS.md, CONCERNS.md).

**Znane problemy z mapy kodu (do uwzględnienia podczas budowy):**
- Dwa pliki `style.css` (root i `src/`) — duplikat źródła prawdy do skonsolidowania
- `src/counter.js` — pozostałość scaffoldu Vite, do usunięcia
- `currentAngle` rośnie bez modulo 2π w `Application.tick()` — drobna higiena numeryczna
- Brak infrastruktury testowej — Vitest do dodania razem z testami logiki SOP
- Brak walidacji wejść w `PhysicsEngine` (zakłada `r > 0`, `l > r·sin(α)`)

**Domena:** Prasa mimośrodowa (eccentric press) to obrabiarka tłocząca, gdzie wirujący wał z mimośrodem przekształca obrót w ruch posuwisto-zwrotny suwaka tłoczącego. Kluczowe komponenty bezpieczeństwa: koło zamachowe (akumulator energii), sprzęgło (włącza ruch suwaka), hamulec (zatrzymuje), osłony (blokada ruchu przy otwartej osłonie), oburęczne sterowanie, E-stop. Procedura uruchomienia w realnym zakładzie obejmuje minimum: kontrola wzrokowa, sprawdzenie oleju, zamknięcie osłon, odblokowanie E-stop, włączenie napędu, sprzęgnięcie po nabraniu obrotów. Pominięcie któregokolwiek może skutkować urazem rąk lub uszkodzeniem maszyny.

**Język:** Polski jest językiem wszystkich UI stringów, komunikatów błędów, dokumentacji JSDoc, treści instrukcyjnych w panelu szkoleniowym. Komentarze w kodzie po polsku. Identyfikatory (klasy, funkcje, zmienne) — angielskie, zgodnie z konwencją bazy kodu.

## Constraints

- **Tech stack**: Three.js r0.184, GSAP 3.15, Vite 8 — bezwzględnie zachować, nie wprowadzać React / Vue / Babylon.js
- **Brak frameworka UI**: Reaktywność osiągamy przez Zustand (vanilla store) + bezpośrednie aktualizacje DOM w klasach typu `UI`/`StepPanel`
- **Język interfejsu**: Polski — wszystkie nowe stringi, komunikaty, JSDoc, treść instrukcji szkoleniowych
- **Środowisko**: Tylko przeglądarka z WebGL. Bez backendu, bez bazy danych. Persystencja przez `localStorage` i eksport plików.
- **Wydajność**: 60 FPS w docelowym scenariuszu (pełna scena, aktywne podświetlenia, raycasting hover) na sprzęcie biurowym (zintegrowana grafika)
- **Kompatybilność**: Modern desktop browsers (Chrome, Firefox, Safari, Edge — ostatnie 2 wersje)
- **Architektura**: Single-page Vite app, brak routera; jedna scena Three.js, panele UI nakładkowe

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Pełny digital twin (koło zamachowe, sprzęgło, hamulec, smarowanie, osłony, E-stop, panel) | Brief zakłada, że każdy element procedury musi być klikalny w 3D — minimum dydaktyczne nie pokryje cyklu pracy ani reakcji na awarię | — Pending |
| Zustand vanilla jako store stanu szkolenia | Framework-agnostic, ~1.2KB, native vanilla API (nie tylko React), idealny pod Three.js bez warstwy reaktywnej; trend 2026 dla małych aplikacji 3D | — Pending |
| Hybrydowa interakcja (klik 3D + checklist) | Realistyczne — niektóre kroki SOP to fizyczna manipulacja (E-stop, osłony), inne to inspekcja wzrokowa ("sprawdziłem olej") nie wymagająca interakcji 3D | — Pending |
| Vitest jako framework testowy | Native dla Vite, brak dodatkowej konfiguracji, jsdom dla testów DOM-zależnych — zero overhead | — Pending |
| Scoring lokalny (localStorage + eksport JSON/PDF) | Brak backendu w v1; szkolenie wewnętrzne firmy — brygadzista może dostać plik mailem | — Pending |
| Pełen zakres SOP v1 (4 procedury) | Bez procedury cyklu / stop / awarii narzędzie nie pokrywa najczęstszych sytuacji wypadkowych — kompromis dydaktyczny niedopuszczalny | — Pending |
| Polski we wszystkich nowych stringach i JSDoc | Spójność z istniejącą bazą; odbiorca to polskojęzyczni operatorzy | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-05 after initialization*
