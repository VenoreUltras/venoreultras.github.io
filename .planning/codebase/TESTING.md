# Testing Patterns

**Analysis Date:** 2026-05-05

## Current Testing Infrastructure

**Status:** NONE

**Framework:** Not configured
- No test runner installed (no jest, vitest, mocha, ava in `package.json`)
- No test files present (no `*.test.js`, `*.spec.js` files)
- No test configuration files (`jest.config.js`, `vitest.config.js`, etc.)

**Test Scripts:** Not defined
- `package.json` contains only: `dev` (vite), `build` (vite build), `preview` (vite preview)
- No `test`, `test:watch`, `test:coverage` scripts

**Coverage:** 0% — No coverage tooling configured

## File Organization

**Test File Locations:**
- Not applicable — no tests written yet
- Recommendation: Use co-located pattern:
  - Unit tests: `src/[ModuleName].test.js` alongside source (e.g., `src/PhysicsEngine.test.js`)
  - Integration tests: `src/__tests__/integration.test.js`

**Test Naming Convention:**
- Recommendation: `[ClassName].test.js` or `[moduleName].spec.js` matching class/module name

## Recommended Testing Strategy

**Framework Choice:** Vitest
- Rationale:
  - Vite-native, zero-config (already using Vite as build tool)
  - ESM support out-of-box (codebase uses `"type": "module"`)
  - Fast unit testing with watch mode
  - Drop-in Jest compatibility (familiar assertion API)

**DOM Testing:** happy-dom
- Lightweight virtual DOM for testing UI interactions without headless browser
- Test `UI` class event binding and DOM updates
- Sufficient for `getElementById` and `innerText` assertions

**Three.js Testing:** Manual snapshots + pure function tests
- Cannot easily snapshot Three.js rendered output in unit tests
- Focus: Test `PhysicsEngine` (pure static methods) and geometry setup logic
- `PressModel.update()`: verify position calculations without rendering (snapshot object positions)
- `SceneSetup`: test that objects are added to scene correctly using spy assertions

## Test Structure Pattern

**Recommended Suite Organization:**
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { PhysicsEngine } from './PhysicsEngine';

describe('PhysicsEngine', () => {
  describe('calculateSliderPosition', () => {
    it('returns correct position at 0 radians (top dead center)', () => {
      const r = 1;
      const l = 4;
      const result = PhysicsEngine.calculateSliderPosition(0, r, l);
      expect(result).toBeCloseTo(r + l, 5);
    });

    it('handles negative angles', () => {
      const r = 0.8;
      const l = 4.0;
      const angle = -Math.PI / 2;
      const result = PhysicsEngine.calculateSliderPosition(angle, r, l);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(r + l);
    });
  });
});
```

**Setup/Teardown Pattern (for DOM tests):**
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UI } from './UI';

describe('UI', () => {
  let container;

  beforeEach(() => {
    // Create minimal DOM structure
    container = document.createElement('div');
    container.innerHTML = `
      <div id="status-dot"></div>
      <div id="status-text"></div>
      <input id="speed-slider" type="range" value="10" />
      <span id="speed-value">10</span>
      <button id="btn-toggle">Start</button>
      <span id="val-angle">0°</span>
      <span id="val-displacement">0 m</span>
    `;
    document.body.appendChild(container);
  });

  afterEach(() => {
    if (container) {
      document.body.removeChild(container);
    }
  });

  it('initializes with isRunning false', () => {
    const ui = new UI();
    expect(ui.isRunning).toBe(false);
  });
});
```

**Assertion Pattern:**
```javascript
expect(result).toBe(expectedValue);          // Exact equality
expect(result).toBeCloseTo(expected, 5);     // Floating point (5 decimals)
expect(obj).toHaveProperty('propertyName');  // Object property
expect(spy).toHaveBeenCalledWith(arg);       // Function call verification
```

## What to Mock

**Mock These:**
- `document.getElementById` in isolation tests (use happy-dom virtual DOM for integration)
- Three.js renderer in unit tests of position calculation (not needed — `PhysicsEngine` is pure)
- DOM event listeners (spy on addEventListener, verify callbacks called)

**Do NOT Mock:**
- `PhysicsEngine.calculateSliderPosition()` — pure math, easy to test directly
- Three.js core (`Group`, `Mesh`, `Vector3`) — integration test these with actual Three.js
- `gsap.ticker` — either mock in unit tests OR test in integration suite with actual GSAP

## Test Coverage Priorities

**High Priority (testable, core logic):**
1. `PhysicsEngine.calculateSliderPosition()` — pure function, multiple test cases for edge cases
   - Top dead center (angle=0)
   - Negative angles
   - Full rotation (angle=2π)
   - Edge case: r > l (kinematic lock)

2. `UI.getAngularVelocity()` — converts RPM to rad/s
   - Running state returns correct velocity
   - Stopped state returns 0
   - Speed changes propagate

3. `PressModel.update()` — geometry position updates
   - Verify slider Y position matches physics output
   - Verify rod position tracks eccentric pin
   - Verify rod rotation angle is calculated correctly

**Medium Priority:**
- `UI` event binding (toggle button, speed slider)
- `SceneSetup` initialization (scene objects created)

**Low Priority (render-dependent, hard to test):**
- Actual Three.js rendering output (use visual/manual QA)
- Animation loop timing (hard to test without mocking GSAP)

## Run Commands

**Recommended setup in package.json:**
```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:watch": "vitest --watch",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}
```

**Run all tests:**
```bash
npm run test
```

**Watch mode (during development):**
```bash
npm run test:watch
```

**Coverage report:**
```bash
npm run test:coverage
```

## Async Testing

**Pattern for GSAP/animation tests:**
```javascript
it('updates angle after tick', async () => {
  const app = new Application();
  // Advance GSAP ticker by 100ms
  await new Promise(resolve => gsap.ticker.add(resolve));
  expect(app.currentAngle).toBeGreaterThan(0);
});
```

**Pattern for DOM event tests:**
```javascript
it('toggles isRunning on button click', () => {
  const ui = new UI();
  expect(ui.isRunning).toBe(false);
  ui.elements.btnToggle.click();
  expect(ui.isRunning).toBe(true);
});
```

## Error Testing

**Pattern for error scenarios:**
```javascript
it('throws when container element not found', () => {
  expect(() => {
    new SceneSetup('nonexistent-id');
  }).toThrow('Container #nonexistent-id not found');
});

it('handles invalid angle gracefully', () => {
  // PhysicsEngine has no validation — test it accepts any number
  expect(() => {
    PhysicsEngine.calculateSliderPosition(NaN, 1, 4);
  }).not.toThrow();
});
```

## Integration Testing

**Recommended approach:**
- Test full Application flow: UI interaction → angle update → physics calculation → 3D update
- Use Vitest's `fake timers` to advance GSAP ticker deterministically
- Verify state consistency across components

**Example:**
```javascript
describe('Application integration', () => {
  it('updates physics when speed slider changes', () => {
    const app = new Application();
    app.ui.elements.speedSlider.value = 100;
    app.ui.elements.speedSlider.dispatchEvent(new Event('input'));
    expect(app.ui.speed).toBe(100);
  });
});
```

## E2E Testing

**Status:** Not applicable
- No Cypress/Playwright configured
- Application is visualization-focused, best tested manually or with visual regression tools
- Could add Playwright for full browser testing of Three.js rendering in CI/CD future

## Fixtures and Test Data

**Recommended location:** `src/__tests__/fixtures.js`

**Example fixture pattern:**
```javascript
// Commonly used test parameters
export const PRESS_CONFIG = {
  r: 0.8,      // Eccentric radius
  l: 4.0,      // Rod length
  shaftY: 8.0
};

export const TEST_ANGLES = {
  TOP_DEAD_CENTER: 0,
  QUARTER_TURN: Math.PI / 2,
  HALF_TURN: Math.PI,
  FULL_ROTATION: Math.PI * 2
};
```

---

*Testing analysis: 2026-05-05*
