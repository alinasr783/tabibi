import { useEffect, useState } from 'react';
import { getMessagingInstance, getToken } from '../lib/firebase';
import supabase from '../services/supabase';
import useUser from '../features/auth/useUser';

const useFcmToken = () => {
  const [token, setToken] = useState(null);
  const [notificationPermissionStatus, setNotificationPermissionStatus] = useState('');
  const { user } = useUser();

  useEffect(() => {
    const retrieveToken = async () => {
      try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
          const messaging = await getMessagingInstance();
          
          if (!messaging) {
            console.log('Firebase Messaging is not supported in this browser.');
            return;
          }

          const permission = await Notification.requestPermission();
          setNotificationPermissionStatus(permission);

          if (permission === 'granted') {
            const currentToken = await getToken(messaging, {
              vapidKey: 'BMYJ2_7q_HhV_b8K_4e_1_2_3_4_5_PLACEHOLDER_KEY_IF_NEEDED' // Optional: providing a VAPID key is often required for web push
            });
            
            if (currentToken) {
              setToken(currentToken);
              if (user?.id) {
                await saveTokenToDatabase(currentToken, user.id);
              }
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          }
        }
      } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
      }
    };

    retrieveToken();
  }, [user]);

  const saveTokenToDatabase = async (token, userId) => {
    try {
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
      }
    } catch (error) {
      console.error('Error in saveTokenToDatabase:', error);
    }
  };

  return { token, notificationPermissionStatus };
};

export default useFcmToken;
