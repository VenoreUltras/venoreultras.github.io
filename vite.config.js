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

// Phase 13: bank pytań BHP (quizData.js ~31 KB tekstu) + selektor trafiają do
// osobnego chunku `quiz-data`, by nie powiększać głównego bundla (gate < 850 KB).
// Chunk jest cache'owalny niezależnie od reszty aplikacji. Logika pozostaje
// synchroniczna (statyczny import z trainingStore) — pełny lazy-load (dynamic
// import) jest przewidziany w Phase 17, gdy QuizController przejmie ładowanie pytań.
// GitHub Pages: aplikacja jest serwowana z subpathu https://<user>.github.io/HydraulicPress/.
// `base` musi pasować do nazwy repo, inaczej assety (JS/CSS) ładują się z roota domeny → 404
// i UI nie startuje (puste modale). Stosujemy base TYLKO dla `vite build` — dev (`serve`) i
// testy (vitest, command !== 'build') zostają na '/', więc import.meta.env.BASE_URL = '/'
// i istniejące asercje testów ('/media/...') nie pękają.
export default ({ command }) => ({
  base: command === 'build' ? '/HydraulicPress/' : '/',
  build: {
    // Phase 16 (MED-01): zero = ZADEN asset nie trafia do bundla jako base64.
    // Pliki z public/media/ pozostaja referencjami (osobne pliki), nie inline.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/data/quizData') || id.includes('src/training/quizSelection')) {
            return 'quiz-data';
          }
        },
      },
    },
  },
});
