// tests/fixtures/scenario.fixture.js
// Minimalny scenariusz-stub dla testów ProcedureEngine i TrainingStore.
// 3 kroki, jeden każdego kind, bez forbidden-state guard.

export const minimalScenario = {
  id: 'fixture-minimal',
  titlePL: 'Fixture',
  descriptionPL: 'Minimalny scenariusz testowy.',
  initialMachineState: 'oczekiwanie-na-inspekcje',
  steps: [
    {
      id: 'step-visual-target',
      kind: 'visual-target',
      targetMeshId: 'mesh-A',
      labelPL: 'Krok visual-target',
      descriptionPL: 'Pierwszy krok.',
      rationalePL: 'Test fixture.',
      effectsOnSuccess: [],
      effectsOnError: [{ type: 'appendEvent', event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' } }],
    },
    {
      id: 'step-visual-attest',
      kind: 'visual-attest',
      labelPL: 'Krok visual-attest',
      descriptionPL: 'Drugi krok.',
      rationalePL: 'Test fixture.',
      effectsOnSuccess: [],
      effectsOnError: [{ type: 'appendEvent', event: { type: 'step.violation', errorCode: 'E-POMINIETO-KONTROLE', severity: 'minor' } }],
    },
    {
      id: 'step-manipulation',
      kind: 'manipulation',
      targetMeshId: 'mesh-B',
      labelPL: 'Krok manipulation',
      descriptionPL: 'Trzeci krok.',
      rationalePL: 'Test fixture.',
      effectsOnSuccess: [{ type: 'setMeshState', meshId: 'mesh-B', value: 'engaged' }],
      effectsOnError: [{ type: 'appendEvent', event: { type: 'step.violation', errorCode: 'E-NIEPRAWIDLOWY-MESH', severity: 'medium' } }],
    },
  ],
};
