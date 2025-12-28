import { createContext, useContext, useEffect } from 'react';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useAuth } from '../auth/AuthContext';

const UserPreferencesContext = createContext(null);

// Convert hex to HSL
function hexToHSL(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

// Apply colors to CSS variables
function applyColors(primary, secondary, accent) {
  if (!primary) return;
  
  const root = document.documentElement;
  
  // Convert hex to HSL for CSS variables
  const primaryHSL = hexToHSL(primary);
  const secondaryHSL = secondary ? hexToHSL(secondary) : primaryHSL;
  const accentHSL = accent ? hexToHSL(accent) : primaryHSL;
  
  // Apply primary color (HSL format without hsl())
  root.style.setProperty('--primary', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
  
  // Apply secondary color
  root.style.setProperty('--secondary', `${secondaryHSL.h} ${secondaryHSL.s}% ${secondaryHSL.l}%`);
  
  // Apply accent color (important for focus states and highlights)
  root.style.setProperty('--accent', `${accentHSL.h} ${accentHSL.s}% ${Math.min(accentHSL.l + 10, 96)}%`);
  root.style.setProperty('--accent-foreground', `${accentHSL.h} ${accentHSL.s}% ${Math.max(accentHSL.l - 40, 11)}%`);
  
  // Apply ring color for focus states
  root.style.setProperty('--ring', `${primaryHSL.h} ${primaryHSL.s}% ${primaryHSL.l}%`);
  
  // Store variants for convenience
  root.style.setProperty('--primary-light', `${primaryHSL.h} ${primaryHSL.s}% ${Math.min(primaryHSL.l + 15, 95)}%`);
  root.style.setProperty('--primary-dark', `${primaryHSL.h} ${primaryHSL.s}% ${Math.max(primaryHSL.l - 15, 5)}%`);
}

// Apply theme mode
function applyThemeMode(mode) {
  const root = document.documentElement;
  
  if (mode === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else if (mode === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    // System preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }
}

// Listen for system theme changes
function setupSystemThemeListener(mode) {
  if (mode !== 'system') return () => {};
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e) => {
    if (e.matches) {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };
  
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}

export function UserPreferencesProvider({ children }) {
  const { user } = useAuth();
  const { data: preferences, isLoading } = useUserPreferences();

  // Apply preferences when loaded
  useEffect(() => {
    if (!preferences || isLoading) return;
    
    // Apply colors
    if (preferences.primary_color) {
      applyColors(
        preferences.primary_color,
        preferences.secondary_color,
        preferences.accent_color
      );
    }
    
    // Apply theme mode
    if (preferences.theme_mode) {
      applyThemeMode(preferences.theme_mode);
    }
    
    // Setup listener for system theme changes
    const cleanup = setupSystemThemeListener(preferences.theme_mode);
    return cleanup;
  }, [preferences, isLoading]);

  // Reset styles when user logs out
  useEffect(() => {
    if (!user) {
      // Reset to defaults
      const root = document.documentElement;
      root.style.removeProperty('--primary');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--primary-light');
      root.style.removeProperty('--primary-dark');
      root.classList.remove('dark', 'light');
    }
  }, [user]);

  const value = {
    preferences,
    isLoading,
    applyColors,
    applyThemeMode,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferencesContext() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferencesContext must be used within UserPreferencesProvider');
  }
  return context;
}

export default UserPreferencesProvider;
