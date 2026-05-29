// src/data/lectorVoices.js
// Phase 11 Plan 11-05 (FUNC-11-12): lista polskich głosów dla LectorService (ElevenLabs).
// Pure-data module — zero importów (boundaries.test.js enforce).
//
// Status MVP (2026-05-29, commit a246084):
//   - Damian PL (S1JKkpuAQNsowB8ZvKRO) — JEDYNY zweryfikowany przez user (ElevenLabs Voice Library).
//   - 2-3 dodatkowe głosy odroczone do v1.2 po user-driven testach.
//
// TODO Phase 11.1 / v1.2: dorzucić 2-3 zweryfikowane PL voiceIds (różne barwy: kobiecy, młody itd.).

export const LECTOR_VOICES = Object.freeze([
  Object.freeze({ id: 'S1JKkpuAQNsowB8ZvKRO', label: 'Damian (PL, mężczyzna)' }),
]);

export const DEFAULT_LECTOR_VOICE_ID = LECTOR_VOICES[0].id;
