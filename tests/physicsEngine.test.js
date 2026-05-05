// tests/physicsEngine.test.js
// @vitest-environment node
// INFRA-04: walidacja wejść PhysicsEngine.
import { describe, it, expect } from 'vitest';
import { PhysicsEngine } from '../src/PhysicsEngine.js';

describe('PhysicsEngine.calculateSliderPosition — input validation (INFRA-04)', () => {
  it('rzuca przy angle = NaN', () => {
    expect(() => PhysicsEngine.calculateSliderPosition(NaN, 0.8, 4))
      .toThrow(/PhysicsEngine: parametry muszą być skończonymi liczbami/);
  });
  it('rzuca przy r = Infinity', () => {
    expect(() => PhysicsEngine.calculateSliderPosition(0, Infinity, 4))
      .toThrow(/skończonymi liczbami/);
  });
  it('rzuca przy l = -NaN-like (NaN)', () => {
    expect(() => PhysicsEngine.calculateSliderPosition(0, 0.8, NaN))
      .toThrow(/skończonymi liczbami/);
  });
  it('rzuca przy r = 0 z komunikatem "r musi być dodatnie" i wartością r', () => {
    expect(() => PhysicsEngine.calculateSliderPosition(0, 0, 4))
      .toThrow(/PhysicsEngine: r musi być dodatnie.*r=0/);
  });
  it('rzuca przy r < 0', () => {
    expect(() => PhysicsEngine.calculateSliderPosition(0, -0.5, 4))
      .toThrow(/r musi być dodatnie/);
  });
  it('rzuca przy l = 0 z komunikatem "l musi być dodatnie"', () => {
    expect(() => PhysicsEngine.calculateSliderPosition(0, 0.8, 0))
      .toThrow(/PhysicsEngine: l musi być dodatnie.*l=0/);
  });
  it('rzuca przy l < 0', () => {
    expect(() => PhysicsEngine.calculateSliderPosition(0, 0.8, -1))
      .toThrow(/l musi być dodatnie/);
  });
  it('rzuca przy r === l (geometria zwyrodniała)', () => {
    expect(() => PhysicsEngine.calculateSliderPosition(0, 4, 4))
      .toThrow(/r musi być mniejsze niż l.*r=4.*l=4/);
  });
  it('rzuca przy r > l', () => {
    expect(() => PhysicsEngine.calculateSliderPosition(0, 5, 4))
      .toThrow(/r musi być mniejsze niż l/);
  });
});

describe('PhysicsEngine.calculateSliderPosition — happy path', () => {
  it('zwraca r + l przy angle = 0 (górne martwe położenie)', () => {
    const y = PhysicsEngine.calculateSliderPosition(0, 0.8, 4);
    expect(y).toBeCloseTo(4.8, 6);
    expect(Number.isFinite(y)).toBe(true);
  });
  it('zwraca √(l² - r²) przy angle = π/2', () => {
    const y = PhysicsEngine.calculateSliderPosition(Math.PI / 2, 0.8, 4);
    expect(y).toBeCloseTo(Math.sqrt(16 - 0.64), 6);
  });
});
