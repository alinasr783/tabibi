import { useEffect, useState } from 'react';
import { getMessagingInstance, getToken } from '../lib/firebase';
import supabase from '../services/supabase';
import useUser from '../features/auth/useUser';
import { useUserPreferences } from './useUserPreferences';

const useFcmToken = () => {
  const [token, setToken] = useState(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState('');
  const { data: user } = useUser();
  const { data: preferences } = useUserPreferences();

  useEffect(() => {
    const retrieveToken = async () => {
      try {
        // Check if notifications are enabled in user preferences
        if (preferences?.notifications_enabled === false) {
          console.log('Notifications disabled by user preference.');
          return;
        }

        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          const messaging = await getMessagingInstance();
          
          if (!messaging) {
            console.log('Firebase Messaging is not supported in this browser.');
            return;
          }

          const permission = await Notification.requestPermission();
          setNotificationPermissionStatus(permission);

          if (permission === 'granted') {
            console.log('Notification permission granted.');
            
            // Get the token
            const currentToken = await getToken(messaging);
            
            if (currentToken) {
              console.log('FCM Token retrieved:', currentToken);
              setToken(currentToken);
              
              if (user?.user_id || user?.id) {
                const userId = user.user_id || user.id;
                console.log('Saving token to database for user:', userId);
                await saveTokenToDatabase(currentToken, userId);
              } else {
                console.error('User ID not found, cannot save token yet. User object:', user);
              }
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          } else {
            console.log('Notification permission denied.');
          }
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
      }
    };

    if (user) {
        retrieveToken();
    }
  }, [user, preferences]);

  const saveTokenToDatabase = async (token, userId) => {
    try {
      // Verify session matches userId
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
         console.error('No active session when saving token');
         return;
      }
      
      if (session.user.id !== userId) {
          console.warn('Session user ID does not match target user ID', { sessionUser: session.user.id, targetUser: userId });
      }

      // Check if token already exists for this user to avoid unnecessary writes
      // Ideally handled by ON CONFLICT in SQL
      const { error } = await supabase
        .from('fcm_tokens')
        .upsert({ 
            user_id: userId, 
            token: token,
            device_type: 'web',
            last_updated: new Date().toISOString()
        }, { onConflict: 'user_id, token' });

      if (error) {
        console.error('Error saving FCM token to Supabase:', error);
      } else {
        console.log('FCM token saved successfully to Supabase.');
      }
    } catch (error) {
      console.error('Error in saveTokenToDatabase:', error);
    }
  };

  return { token, notificationPermissionStatus };
};

export default useFcmToken;
