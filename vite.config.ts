import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {VitePWA} from 'vite-plugin-pwa';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({mode}) => {
  const desktop = mode === 'desktop';
  const demo = mode === 'demo';
  return {
    publicDir: demo ? '.demo-public' : 'public',
    define: {
      'import.meta.env.VITE_INTERNAL_TOOLS': JSON.stringify(mode === 'internal' ? '1' : '0'),
      'import.meta.env.VITE_DESKTOP': JSON.stringify(desktop ? '1' : '0'),
      'import.meta.env.VITE_DEMO': JSON.stringify(demo ? '1' : '0'),
    },
    plugins: [
      react(),
      tailwindcss(),
      ...(!desktop ? [VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: demo ? "Iron Kestrel '87 Demo" : "Iron Kestrel '87: North Atlantic Air War",
          short_name: demo ? "Kestrel '87 Demo" : "Iron Kestrel '87",
          description: demo ? 'Guided carrier qualification and Fleet Defence browser demo.' : 'A painted 2D Cold War VTOL action-simulation set across the North Atlantic.',
          theme_color: '#07110d',
          background_color: '#030806',
          display: 'standalone',
          orientation: 'landscape',
          start_url: '/',
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,json,jpg,png,webp,wav,svg,woff2,txt}'],
          globIgnores: demo ? ['assets/Operation*.js', 'assets/ChapterSelect*.js', 'assets/NorwegianCampaignMap*.js', 'assets/LandingPracticeScreen*.js'] : [],
          navigateFallback: 'index.html',
          // The two full-screen painted mission plates are intentionally kept
          // at source resolution and remain small enough for one-time offline caching.
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
      })] : []),
      ...(demo ? [{
        name: 'iron-kestrel-demo-html',
        transformIndexHtml(html: string) {
          return html
            .replace("Iron Kestrel '87: North Atlantic Air War", "Iron Kestrel '87 Demo")
            .replace('Painted Cold War VTOL action-simulation set across an alternative 1987 North Atlantic.', 'Focused browser demo featuring carrier qualification and Fleet Defence.');
        },
      }] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: demo ? 'dist-demo' : 'dist',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/scheduler')) return 'react-vendor';
            if (id.includes('node_modules/lucide-react')) return 'icon-vendor';
            if (id.includes('node_modules/motion')) return 'motion-vendor';
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      port: desktop ? 1420 : 5173,
      strictPort: desktop,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Use a project-specific port so parallel local Vite apps cannot steal the update channel.
      hmr: process.env.DISABLE_HMR !== 'true' ? { port: 24679 } : false,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
