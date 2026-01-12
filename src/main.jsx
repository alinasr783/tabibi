import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import React from "react";
import {createRoot} from "react-dom/client";
import { HelmetProvider } from 'react-helmet-async';
import "react-loading-skeleton/dist/skeleton.css";
import App from "./App.jsx";
import "./index.css";

// Optimize React Query settings for better performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1, // Reduce retry attempts
      refetchOnWindowFocus: false, // Disable refetching on window focus for better performance
      refetchOnReconnect: false, // Disable refetching on reconnect
    },
  },
});

// Register service worker for offline support and PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000); // Check every hour
      })
      .catch((registrationError) => {
        console.log('❌ Service Worker registration failed:', registrationError);
      });
  });
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  console.log('💾 PWA install prompt ready');
  
  // Store in window for components to access
  window.deferredPrompt = deferredPrompt;
});

// Track PWA installation
window.addEventListener('appinstalled', () => {
  console.log('✅ PWA installed successfully!');
  deferredPrompt = null;
  window.deferredPrompt = null;
});

createRoot(document.getElementById("root")).render(
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </QueryClientProvider>
);
