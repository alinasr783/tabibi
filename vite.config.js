import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
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
    // Reduce bundle size by enabling tree shaking
    rollupOptions: {
      output: {
        // Split vendor and app code into separate chunks
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          data: ['@tanstack/react-query', '@supabase/supabase-js'],
          utils: ['lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority']
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