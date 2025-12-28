import { createContext, useContext } from 'react';
import { useUserPreferences } from '../hooks/useUserPreferences';

// Create context
const UserPreferencesContext = createContext();

// Provider component
export function UserPreferencesProvider({ children }) {
  const { data: preferences, isLoading } = useUserPreferences();

  const value = {
    preferences: preferences || {},
    isLoading,
    
    // Theme colors
    primaryColor: preferences?.primary_color || '#1AA19C',
    secondaryColor: preferences?.secondary_color || '#224FB5',
    accentColor: preferences?.accent_color || '#FF6B6B',
    
    // Layout
    themeMode: preferences?.theme_mode || 'light',
    sidebarStyle: preferences?.sidebar_style || 'default',
    sidebarCollapsed: preferences?.sidebar_collapsed || false,
    
    // Localization
    language: preferences?.language || 'ar',
    
    // Menu & Dashboard
    menuItems: preferences?.menu_items || [],
    dashboardWidgets: preferences?.dashboard_widgets || [],
    
    // Notifications
    notificationsEnabled: preferences?.notifications_enabled !== false,
    soundNotifications: preferences?.sound_notifications !== false,
    
    // Branding
    companyName: preferences?.company_name,
    logoUrl: preferences?.logo_url,
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

// Hook to use preferences
export function useUserPreferencesContext() {
  const context = useContext(UserPreferencesContext);
  
  if (!context) {
    throw new Error('useUserPreferencesContext must be used within UserPreferencesProvider');
  }
  
  return context;
}
