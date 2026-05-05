# Coding Conventions

**Analysis Date:** 2026-05-05

## Naming Patterns

**Files:**
- PascalCase for classes: `SceneSetup.js`, `PressModel.js`, `PhysicsEngine.js`
- camelCase for utility functions: `counter.js`, `main.js`

**Functions:**
- camelCase for all method names: `calculateSliderPosition()`, `buildMaterials()`, `updateTelemetry()`, `getAngularVelocity()`
- camelCase for regular functions: `setupCounter()`

**Variables:**
- camelCase for instance fields: `this.r`, `this.currentAngle`, `this.isRunning`, `this.speed`
- camelCase for local variables: `dtSeconds`, `angularVelocity`, `displacement`

**Types/Classes:**
- PascalCase: `PhysicsEngine`, `SceneSetup`, `PressModel`, `UI`, `Application`

**Constants:**
- No SCREAMING_SNAKE_CASE observed in codebase. Machine parameters stored as instance fields (e.g., `this.r`, `this.l`, `this.shaftY` in `PressModel`)

## Module System

**Module Format:**
- ES modules only (`"type": "module"` in `package.json`)
- Uses `import`/`export` syntax throughout: `import * as THREE from 'three'`, `import { gsap } from 'gsap'`, `export class [ClassName]`
- Export pattern: named exports as classes (`export class PhysicsEngine`, `export class UI`)
- No default exports observed

## Code Style

**Formatting:**
- No linter or formatter configured (no `.eslintrc`, `.prettierrc`, `.editorconfig`)
- Indentation: 2 spaces (observed in all source files)
- Line breaks: Unix style (LF)
- No automatic formatting pipeline

**Comments Language:**
- ALL code comments written in POLISH
- Examples: `// Obliczamy przyrost kąta`, `// Parametry maszyny (możesz zmieniać tutaj)`, `// Wał główny (Shaft) - oś obrotu`

## Documentation & JSDoc

**Pattern:**
- Selective use of JSDoc — not every method documented, only where logic is complex or return types need clarification
- Methods with JSDoc: `PhysicsEngine.calculateSliderPosition()` (full block with @param, @returns), `PressModel.update()`, `UI.getAngularVelocity()`, `UI.updateTelemetry()`
- Methods without JSDoc: `buildMaterials()`, `bindEvents()`, `updateStatus()`, class constructors
- JSDoc blocks include @param and @returns tags with type and description

Examples:
```javascript
/**
 * Zwraca prędkość obrotową w radianach na sekundę
 */
getAngularVelocity() {
  return this.isRunning ? (this.speed / 60) * Math.PI * 2 : 0;
}

/**
 * Oblicza pozycję suwaka na osi Y w mechanizmie korbowo-wodzikowym.
 * Wzór: y = r * cos(alpha) + sqrt(l^2 - (r * sin(alpha))^2)
 * 
 * @param {number} angle - Kąt obrotu wału (w radianach, 0 to górne martwe położenie)
 * @param {number} r - Promień korby (skok prasy to 2 * r)
 * @param {number} l - Długość korbowodu
 * @returns {number} Aktualna pozycja Y suwaka
 */
static calculateSliderPosition(angle, r, l) {
```

## UI Strings & Localization

**Language:** Polish
- ALL user-facing text is in Polish: button labels, status messages, telemetry labels
- Examples from `UI.js`:
  - `'Praca ciągła'` (continuous operation)
  - `'Zatrzymana'` (stopped)
- Status dot classes and telemetry display: `valAngle`, `valDisplacement` (measurement units in Polish in display context: `°`, `m`)

## Class Design

**Pattern:** ES6 class syntax (no TypeScript)
- Constructor initializes instance fields and calls setup methods: `buildMaterials()`, `buildPress()`, `bindEvents()`
- Private/public distinction: No explicit access modifiers used; all properties are public (JS convention pre-TS)
- State stored as instance fields: `this.scene`, `this.elements` (map of DOM refs), `this.isRunning`, `this.speed`
- Methods follow order: constructor → public initialization/setup → event handlers → getters/setters → utility methods

Example structure from `PressModel`:
```javascript
export class PressModel {
  constructor(scene) {
    this.scene = scene;
    // ... parameter initialization ...
    this.group = new THREE.Group();
    this.buildMaterials();
    this.buildPress();
  }

  buildMaterials() { /* ... */ }
  buildPress() { /* ... */ }
  update(angle) { /* ... */ }
}
```

## Three.js Conventions

**Object Hierarchy:**
- Uses Three.js `Group` for hierarchical transforms: `shaftAxis` (rotating part), `rod` (connecting rod)
- Meshes added to groups for parent-child relationships: eccentric added to `shaftAxis`, shaft added to `shaftAxis`, rod mesh added to `rod` Group

**Materials:**
- Materials cached as instance fields in model class: `this.matBody`, `this.matShaft`, `this.matEccentric`, `this.matRod`, `this.matSlider`, `this.matBase`
- All use `MeshStandardMaterial` for consistent PBR lighting
- Created once in `buildMaterials()`, reused across mesh creation

**Shadow Handling:**
- Per-mesh shadow configuration: `castShadow = true` for moving/dynamic objects, `receiveShadow = true` for static surfaces
- Shadow map enabled globally in renderer: `renderer.shadowMap.enabled = true` (in `SceneSetup`)

Example:
```javascript
leftFrame.castShadow = true;
leftFrame.receiveShadow = true;
base.receiveShadow = true;
```

## Error Handling

**Strategy:** Minimal — trust browser environment
- Only explicit throw in `SceneSetup` constructor for missing DOM container:
  ```javascript
  if (!this.container) throw new Error(`Container #${containerId} not found`);
  ```
- No try-catch blocks observed
- No validation of physics parameters or null checks beyond DOM initialization
- Relies on caller providing valid numeric inputs

## State Management

**Pattern:** Instance fields on classes (no external state library)
- Per-instance state in class properties: `Application` tracks `currentAngle`, `pressModel`, `ui`
- `UI` tracks `isRunning` (boolean), `speed` (number)
- `PressModel` tracks geometry state (`r`, `l`, `shaftY`) and object references (`group`, `shaftAxis`, `rod`, `slider`)
- No global variables, no Vuex/Redux, no stores

**UI State:**
- DOM element references cached in `UI.elements` (map object keyed by semantic ID):
  ```javascript
  this.elements = {
    statusDot: document.getElementById('status-dot'),
    statusText: document.getElementById('status-text'),
    speedSlider: document.getElementById('speed-slider'),
    // ...
  };
  ```

## Animation Loop

**Framework:** GSAP ticker (via `gsap.ticker.add()`)
- Used in preference to `requestAnimationFrame` for smooth, consistent timing
- Called from `Application.tick()` with `deltaTime` (milliseconds)
- Time-driven rotation: `currentAngle += angularVelocity * dtSeconds`

## Import Organization

**Pattern:** Grouped by source
1. CSS/style imports (Vite): `import './style.css'`
2. Third-party libraries: `import * as THREE from 'three'`, `import { gsap } from 'gsap'`
3. Local modules: `import { SceneSetup } from './SceneSetup'`, etc.

No path aliases configured (no `~`, `@` prefixes observed).

## Known Code Issues

**SYNTAX ERROR in `UI.js` lines 67-68:**
- Extra closing brace after class body:
  ```javascript
  updateTelemetry(angleRad, displacement) {
    // ... method body ...
  }

  }  // <-- EXTRA BRACE
}
```
- This causes syntax error on page load. Must be removed.

---

*Convention analysis: 2026-05-05*
