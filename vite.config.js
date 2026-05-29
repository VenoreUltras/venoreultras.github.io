// vite.config.js
// Phase 11 Plan 11-05 (FUNC-11-09): Vite konfiguracja.
//
// Domyślnie projekt nie wymaga jawnej konfiguracji — Vite działa "out of the box".
// Ten plik istnieje by trzymać UDOKUMENTOWANY DEV PROXY FALLBACK dla ElevenLabs CORS.
//
// CORS: bezpośredni fetch z localhost:5173 do api.elevenlabs.io zwykle przechodzi
// (ElevenLabs ustawia Access-Control-Allow-Origin: *). Jeśli jednak CORS zablokuje,
// odkomentuj poniższy blok i zmień TTS_ENDPOINT w src/lector/LectorService.js na
// '/elevenlabs/v1/text-to-speech' (relative path). Restart `npm run dev` po zmianie.
//
// import { defineConfig } from 'vite';
// export default defineConfig({
//   server: {
//     proxy: {
//       '/elevenlabs': {
//         target: 'https://api.elevenlabs.io',
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/elevenlabs/, ''),
//       },
//     },
//   },
// });

export default {};
