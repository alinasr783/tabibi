import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['logo.jpeg', 'manifest.json']
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  // Server configuration to fix HMR issues
  server: {
    // Allow connections from any host (useful for Docker/containerized environments)
    host: true,
    // Use a specific port
    port: 3000,
    // Ensure WebSocket connections work properly
    strictPort: false,
    // Configure HMR to work with service workers
    hmr: {
      overlay: true
    }
  },
  // Build configuration for production
  build: {
    target: 'es2020',
    sourcemap: true,
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter(
          (dep) =>
            !/\/(ai|charts|motion|swiper|firebase|dnd|lottie|pdf)-/.test(dep)
        )
      }
    },
    // Reduce bundle size by enabling tree shaking
    rollupOptions: {
      output: {
        // Split vendor and app code into separate chunks
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('firebase')) return 'firebase';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('recharts')) return 'charts';
          if (id.includes('@react-pdf') || id.includes('jspdf')) return 'pdf';
          if (id.includes('react-dnd')) return 'dnd';
          if (id.includes('swiper')) return 'swiper';
          if (
            id.includes('openai') ||
            id.includes('@google') ||
            id.includes('@mistralai') ||
            id.includes('@openrouter') ||
            id.includes('@cerebras')
          ) {
            return 'ai';
          }
          if (id.includes('lottie-web')) return 'lottie';

          if (id.includes('@tanstack') || id.includes('@supabase')) return 'data';
          if (id.includes('@radix-ui') || id.includes('@ark-ui')) return 'ui';
          if (
            id.includes('clsx') ||
            id.includes('tailwind-merge') ||
            id.includes('class-variance-authority')
          ) {
            return 'utils';
          }

          if (
            /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)
          ) {
            return 'vendor';
          }
        }
      }
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query']
  },
  publicDir: 'public'
})
