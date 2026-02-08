// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
// import { getAnalytics } from "firebase/analytics"; // Lazy loaded

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAQlHGe62U0s5FhsJ4u1eBpOFhwAYvnCeg",
  authDomain: "tabibi-813f7.firebaseapp.com",
  projectId: "tabibi-813f7",
  storageBucket: "tabibi-813f7.firebasestorage.app",
  messagingSenderId: "927864027980",
  appId: "1:927864027980:web:3fb30ba2cc8d541e89ede9",
  // Note: An additional Google Analytics tag (G-WNK347J2TS) is manually added in index.html
  measurementId: "G-Q8WKGL7MSM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Lazy loaded

// Lazy load analytics
export const initAnalytics = async () => {
  if (typeof window !== 'undefined') {
    try {
      const { getAnalytics } = await import("firebase/analytics");
      return getAnalytics(app);
    } catch (error) {
      console.error("Failed to initialize Firebase Analytics", error);
    }
  }
};

let messaging = null;

const getMessagingInstance = async () => {
  try {
    if (typeof window !== 'undefined' && await isSupported()) {
      if (!messaging) {
        messaging = getMessaging(app);
      }
      return messaging;
    }
  } catch (err) {
    console.warn('Firebase Messaging not supported or failed to initialize:', err);
  }
  return null;
};

export { app, getMessagingInstance, getToken, onMessage };
