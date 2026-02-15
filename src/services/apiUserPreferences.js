import supabase from './supabase';
import { normalizeMedicalFieldsConfig } from "../lib/medicalFieldsConfig";

// ========================
// User Preferences API
// ========================

// Default preferences
const DEFAULT_PREFERENCES = {
  theme_mode: 'light',
  primary_color: '#1AA19C',
  secondary_color: '#224FB5',
  accent_color: '#FF6B6B',
  sidebar_style: 'default',
  sidebar_collapsed: false,
  language: 'ar',
  notifications_enabled: true,
  sound_notifications: true,
  menu_items: [],
  dashboard_widgets: [],
  // Daily email settings
  daily_appointments_email_enabled: false,
  daily_appointments_email_time: '07:00',
  timezone: 'Africa/Cairo'
};

function attachComputedDefaults(preferences) {
  const base = preferences && typeof preferences === "object" ? preferences : {};
  return {
    ...DEFAULT_PREFERENCES,
    ...base,
    medical_fields_config: normalizeMedicalFieldsConfig(base.medical_fields_config),
  };
}

// Get user preferences (creates default if not exists)
export async function getUserPreferences() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Try to get existing preferences
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    // If no row exists, create one with defaults
    if (!data && !error) {
      const { data: newData, error: insertError } = await supabase
        .from('user_preferences')
        .insert({
          user_id: session.user.id,
          ...DEFAULT_PREFERENCES
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Error creating user preferences:', insertError);
        return attachComputedDefaults(DEFAULT_PREFERENCES);
      }
      return attachComputedDefaults(newData);
    }

    if (error) {
      console.error('Error fetching user preferences:', error);
      return attachComputedDefaults(DEFAULT_PREFERENCES);
    }

    return attachComputedDefaults(data);
  } catch (error) {
    console.error('Error in getUserPreferences:', error);
    return attachComputedDefaults(DEFAULT_PREFERENCES);
  }
}

// Update user preferences (upsert - creates if not exists)
export async function updateUserPreferences(preferences) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    // First ensure preferences row exists
    await getUserPreferences();

    // Now update
    const { data, error } = await supabase
      .from('user_preferences')
      .update({
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
}

// Update theme mode
export async function updateThemeMode(themeMode) {
  return updateUserPreferences({ theme_mode: themeMode });
}

// Update colors
export async function updateColors(primaryColor, secondaryColor, accentColor) {
  return updateUserPreferences({
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    accent_color: accentColor
  });
}

// Update menu items order
export async function updateMenuItemsOrder(menuItems) {
  return updateUserPreferences({ menu_items: menuItems });
}

// Update sidebar style
export async function updateSidebarStyle(sidebarStyle) {
  return updateUserPreferences({ sidebar_style: sidebarStyle });
}

// Update language
export async function updateLanguage(language) {
  return updateUserPreferences({ language });
}

// Update notification preferences
export async function updateNotificationPreferences(notificationsEnabled, soundNotifications) {
  return updateUserPreferences({
    notifications_enabled: notificationsEnabled,
    sound_notifications: soundNotifications
  });
}

// Update dashboard widgets
export async function updateDashboardWidgets(widgets) {
  return updateUserPreferences({ dashboard_widgets: widgets });
}

// Update branding
export async function updateBranding(companyName, logoUrl) {
  return updateUserPreferences({
    company_name: companyName,
    logo_url: logoUrl
  });
}

// Toggle sidebar collapse
export async function toggleSidebarCollapsed(collapsed) {
  return updateUserPreferences({ sidebar_collapsed: collapsed });
}

// ========================
// Daily Email Settings
// ========================

// Get daily email settings
export async function getDailyEmailSettings() {
  const prefs = await getUserPreferences();
  return {
    enabled: prefs?.daily_appointments_email_enabled ?? false,
    time: prefs?.daily_appointments_email_time ?? '07:00',
    timezone: prefs?.timezone ?? 'Africa/Cairo'
  };
}

// Enable daily appointments email
export async function enableDailyAppointmentsEmail() {
  return updateUserPreferences({ daily_appointments_email_enabled: true });
}

// Disable daily appointments email
export async function disableDailyAppointmentsEmail() {
  return updateUserPreferences({ daily_appointments_email_enabled: false });
}

// Update daily email time
export async function updateDailyAppointmentsEmailTime(time) {
  // Validate time format (HH:MM)
  const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  if (!timeRegex.test(time)) {
    throw new Error('صيغة الوقت غير صحيحة. استخدم HH:MM');
  }
  return updateUserPreferences({ daily_appointments_email_time: time });
}

// Update timezone
export async function updateTimezone(timezone) {
  const validTimezones = [
    'Africa/Cairo',
    'Asia/Riyadh',
    'Asia/Dubai',
    'Europe/London',
    'UTC'
  ];
  
  if (!validTimezones.includes(timezone)) {
    throw new Error('المنطقة الزمنية غير مدعومة');
  }
  
  return updateUserPreferences({ timezone });
}

// Update all daily email settings at once
export async function updateDailyEmailSettings(settings) {
  const updates = {};
  
  if (typeof settings.enabled === 'boolean') {
    updates.daily_appointments_email_enabled = settings.enabled;
  }
  
  if (settings.time) {
    const timeRegex = /^([01]?\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(settings.time)) {
      throw new Error('صيغة الوقت غير صحيحة');
    }
    updates.daily_appointments_email_time = settings.time;
  }
  
  if (settings.timezone) {
    updates.timezone = settings.timezone;
  }
  
  return updateUserPreferences(updates);
}
