---
name: "full-offline-mode"
description: "Implements complete offline-first architecture for Tabibi SaaS. Invoke when user wants full offline capability with local data persistence and background sync."
---

# Full Offline Mode Implementation

## Overview
This skill implements a complete offline-first architecture for the Tabibi healthcare SaaS platform, enabling users to work fully offline (except AI features) with automatic background synchronization when connectivity returns.

## Core Architecture

### Data Layer (IndexedDB via idb)
- All clinic data synced from Supabase → encrypted local storage
- Separate stores: patients, appointments, visits, treatment_plans, financial_records, clinic_settings, user_preferences
- Hybrid Logical Clock (HLC) for conflict resolution with Last-Write-Wins (LWW)
- Operation queue for pending sync operations

### Sync Strategy
- **On Login**: Full data sync from Supabase to IndexedDB
- **On Connectivity Change**: Sync pending operations → fetch latest changes
- **Periodic Background Sync**: Every 30 seconds when online and unsynced items exist
- **On Demand**: User can trigger manual sync from settings

### Offline Settings Tab (SettingsPage)
New tab "بدون انترنت" with:
1. **Data Sync Button**: Verify/compare Supabase vs Local data
2. **Encryption Status**: Two buttons showing Supabase encryption vs Local encryption
3. **Offline Toggle**: Biometric-protected enable/disable
4. **Last Sync Info**: Timestamp of last successful sync
5. **Pending Actions Counter**: Number of queued operations

### Key Files to Modify
- `src/features/offline-mode/offlineDB.js` - Add all new stores
- `src/features/offline-mode/sync.js` - Full data sync logic
- `src/features/offline-mode/useOfflineData.js` - All CRUD operations
- `src/features/offline-mode/OfflineContext.jsx` - Context provider
- `src/pages/SettingsPage.jsx` - Add new tab
- `src/components/settings/OfflineSettingsTab.jsx` - New tab component

### Entity Offline Support (Priority Order)
1. patients (already done)
2. appointments - create/update/delete offline
3. visits - create/update offline
4. treatment_plans - create/update/delete offline
5. financial_records - create offline
6. notifications - local only
7. clinic_settings - sync on login
8. user_preferences - sync on login
9. treatment_templates - sync on login

### Sync Flow
1. User logs in → full data pull from Supabase → encrypted storage in IndexedDB
2. User works offline → operations queued with temp IDs
3. Network returns → sync queue → Supabase ingest-events → replace temp IDs with real IDs
4. Update local records with real IDs from response

### UI Indicators
- Offline mode badge in header
- Pending sync count in settings
- Last sync timestamp
- Per-record sync status icon