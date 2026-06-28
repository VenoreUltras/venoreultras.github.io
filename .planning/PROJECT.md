# PM-300 Trener — Symulator Szkoleniowy Prasy Mimośrodowej

## Current State

**Shipped:**
- ✅ v1.0 — SOP Training Layer (2026-05-28) — 4 scenariusze grywalne (uruchomienie / cykl-pracy / zatrzymanie / awaria), redundant visual feedback, warstwa edukacyjna, replay ze scrubberem, eksport PDF/JSON. 6 faz, 38 planów, 642/642 testów. Audit: `.planning/v1.0-MILESTONE-AUDIT.md`.
- ✅ v1.1 — Visual Quality & Press Realism (2026-05-29) — naprawa bugów rotacji + floating, fundament/stół/wsporniki, przemysłowe detale (śruby/kable/panele), materiały PBR (fazy 7-9). Następnie fazy 10-11: półprzezroczysta osłona + łączniki mechanizmu + animacje GSAP klik (10), oraz 3 spójne tryby (swobodny/nauka/egzamin) + wskaźnik statusu + rozbudowane etykiety 15 interactables + **lektor głosowy ElevenLabs** (11). 903 testy zielone, bundle 809.94 KB / 850 KB.
- ✅ v1.2 — Rozbudowa edukacyjna i realizm (2026-06-19) — menu startowe z wyborem trybu, pełnoekranowy overlay (ElementInfoOverlay) zamiast bocznego panelu, instrukcje BHP + media w public/media/, płytka znamionowa (TextureLoader), egzamin hybrydowy (interakcja 3D + quiz BHP). 6 faz (12-17), 1010 testów, bundle 834.98 KB / 850 KB. Audit: `.planning/v1.2-MILESTONE-AUDIT.md`.

## Current Milestone: v1.3 Uproszczenie i dopracowanie egzaminu

**Goal:** Odchudzić aplikację z funkcji eksportu i zbędnego UI oraz dopracować doświadczenie egzaminu/quizu — jeden spójny wynik i czytelny feedback odpowiedzi.

**Target features:**
- Usunięcie eksportu wyników — wycofanie PDF (`PdfExporter.js`) i JSON (`JsonExporter.js`) wraz z przyciskami w `SessionOverlay` oraz zależnościami `jspdf` + `html2canvas` (zysk na bundle)
- Usunięcie panelu „Parametry Układu" — `info-panel` (skok/korbowód/kąt/wychylenie + wzór kinematyczny) z `index.html` i powiązany update telemetrii w `UI.js`
- Połączona punktacja egzaminu — jeden wynik z interakcji 3D (SOP) + quizu BHP, proporcjonalnie do zdobytych punktów (% z maksimum)
- Feedback odpowiedzi w quizie — po zaznaczeniu zielony=poprawna / czerwony=błędna, w trybie nauka i egzamin
- Responsywne okno quizu — żadne pytanie nie zostaje ucięte (dopasowanie rozmiaru / scroll modala)
- Usunięcie dźwięku pracującej prasy — wycięcie HUM-u z `AudioController.js` (alarm i confirm pozostają)

**Out of scope tego milestone:** alarm i confirm w AudioController (zostają — feedback bezpieczeństwa/UX); eksport wyników w jakiejkolwiek formie (wycofany).

**Następnie (v2 docking points):** DIFF-01..04 — ExplodedViewController, randomized faults, supervisor recommendations, font scaling + high-contrast theme; adaptacyjny dobór pytań quizu wg błędów SOP.

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

_None._ Wszystkie wymagania v1.0 dostarczone — zobacz archiwum milestone v1.0 (`milestones/v1.0-REQUIREMENTS.md` + `milestones/v1.0-ROADMAP.md`). Nowy milestone definiuje się przez `/gsd-new-milestone <version>`.

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
| Pełny digital twin (koło zamachowe, sprzęgło, hamulec, smarowanie, osłony, E-stop, panel) | Brief zakłada, że każdy element procedury musi być klikalny w 3D — minimum dydaktyczne nie pokryje cyklu pracy ani reakcji na awarię | ✓ Validated v1.0 |
| Zustand vanilla jako store stanu szkolenia | Framework-agnostic, ~1.2KB, native vanilla API (nie tylko React), idealny pod Three.js bez warstwy reaktywnej; trend 2026 dla małych aplikacji 3D | ✓ Validated v1.0 |
| Hybrydowa interakcja (klik 3D + checklist) | Realistyczne — niektóre kroki SOP to fizyczna manipulacja (E-stop, osłony), inne to inspekcja wzrokowa ("sprawdziłem olej") nie wymagająca interakcji 3D | ✓ Validated v1.0 |
| Vitest jako framework testowy | Native dla Vite, brak dodatkowej konfiguracji, jsdom dla testów DOM-zależnych — zero overhead | ✓ Validated v1.0 |
| Scoring lokalny (localStorage + eksport JSON/PDF) | Brak backendu w v1; szkolenie wewnętrzne firmy — brygadzista może dostać plik mailem | ✓ Validated v1.0 |
| Pełen zakres SOP v1 (4 procedury) | Bez procedury cyklu / stop / awarii narzędzie nie pokrywa najczęstszych sytuacji wypadkowych — kompromis dydaktyczny niedopuszczalny | ✓ Validated v1.0 |
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
*Last updated: 2026-06-28 — milestone v1.3 (Uproszczenie i dopracowanie egzaminu) started*
