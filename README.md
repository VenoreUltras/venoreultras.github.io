# Interaktywna Instrukcja Prasy Mimośrodowej

Wirtualny symulator i platforma szkoleniowa przeznaczona do nauki obsługi, poznawania kinematyki oraz bezpiecznej pracy z prasą mimośrodową (np. model PM-300). Projekt z założenia ma służyć jako interaktywny podręcznik połączony z panelem testowym dla przyszłych operatorów.

## 🎯 Cel Projektu

1. **Edukacja**: Zobrazowanie na żywo mechaniki układu korbowo-wodzikowego (wał, mimośród, suwak).
2. **Instruktaż**: Przeprowadzenie użytkownika przez procedury uruchamiania prasy.
3. **Testowanie wiedzy**: Możliwość wprowadzania interaktywnych awarii, sprawdzania reakcji operatora i zaliczania poszczególnych modułów szkoleniowych.

## 🛠 Technologie

- **Vite** - szybki bundler i serwer deweloperski
- **Three.js** - renderowanie parametrycznej grafiki 3D maszyny z prymitywów geometrycznych
- **GSAP** - zarządzanie płynną pętlą animacji i potencjalnymi przejściami kamery
- **Vanilla JS / CSS** - nowoczesny, szklany (glassmorphism) interfejs inżynierski (UI)

---

## 👥 Podział Pracy (Zespół 3-osobowy)

Projekt został zaprojektowany tak, aby umożliwić równoległą pracę 3 programistów. Poniżej znajduje się proponowany podział ról wraz z zakresem obowiązków:

### 1. Inżynier Grafiki 3D (Zarządca Sceny)
Osoba odpowiedzialna za wizualną stronę prasy i środowisko 3D.
- **Pliki:** `SceneSetup.js`, `PressModel.js`
- **Obowiązki:**
  - Ulepszanie brył maszyn (dodanie osłon BHP, panelu sterowniczego, pedału nożnego).
  - Praca z oświetleniem, materiałami (metaliczność, cienie) oraz ustawieniami kamery.
  - Oznaczanie interaktywnych elementów prasy (np. klikalne strefy za pomocą Raycastera).

### 2. Frontend & UI/UX Developer (Kreator Szkolenia)
Osoba odpowiedzialna za interfejs użytkownika, logikę wprowadzania danych i nawigację.
- **Pliki:** `index.html`, `style.css`, `UI.js`
- **Obowiązki:**
  - Budowanie nowoczesnych nakładek UI (checklisty procedur startowych, okna powiadomień).
  - Dodawanie kroków szkoleniowych (np. "Krok 1: Włącz zasilanie", "Krok 2: Ustaw obroty").
  - Optymalizacja responsywności (RWD) na tabletach, które mogą być używane podczas szkoleń na hali.

### 3. Logika, Fizyka i Architektura (Backend/State Manager)
Osoba spinająca całość, odpowiedzialna za matematykę, poprawność działania oraz zapisywanie wyników testu.
- **Pliki:** `PhysicsEngine.js`, `main.js`, (w przyszłości: moduł sprawdzający testy)
- **Obowiązki:**
  - Utrzymanie i rozbudowa równań kinematycznych (np. uwzględnienie bezwładności koła zamachowego, kolizji w przestrzeni roboczej).
  - Implementacja maszyny stanów (State Machine) zarządzającej trybami: *Swobodne przeglądanie* / *Tryb szkolenia* / *Egzamin*.
  - Łączenie danych telemetrycznych prasy z systemem punktacji dla użytkownika.

---

## 📂 Struktura Plików

```text
├── index.html           # Główny widok i kontener UI
├── style.css            # Style dla elementów interfejsu (Glassmorphism)
├── package.json         # Konfiguracja zależności npm
└── src/
    ├── main.js          # Główny rdzeń aplikacji (pętla GSAP)
    ├── PhysicsEngine.js # Czysta matematyka układu korbowego
    ├── PressModel.js    # Klasa budująca elementy prasy w Three.js
    ├── SceneSetup.js    # Konfiguracja WebGL, świateł i kamery
    └── UI.js            # Most łączący widok HTML z logiką aplikacji
```

## 🚀 Jak uruchomić?

1. Sklonuj repozytorium.
2. Zainstaluj zależności:
   ```bash
   npm install
   ```
3. Uruchom lokalny serwer deweloperski:
   ```bash
   npm run dev
   ```
4. Otwórz w przeglądarce adres `http://localhost:5173/`.
