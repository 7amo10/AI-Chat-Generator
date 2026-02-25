import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

export default defineConfig({
  adapter: node({ mode: 'standalone' }),
  integrations: [
    mdx(),
    react(),
    tailwind(),
  ],
  site: 'https://ai-chat-generator.dev',
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Isolate Three.js (~880 kB) so it only loads on pages that need it
            'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
            // React runtime shared across all islands
            'react-vendor': ['react', 'react-dom'],
            // Animation library
            'motion-vendor': ['framer-motion'],
          },
        },
      },
    },
  },
});
