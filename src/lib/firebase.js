const firebaseConfig = {
  apiKey: "AIzaSyAQlHGe62U0s5FhsJ4u1eBpOFhwAYvnCeg",
  authDomain: "tabibi-813f7.firebaseapp.com",
  projectId: "tabibi-813f7",
  storageBucket: "tabibi-813f7.firebasestorage.app",
  messagingSenderId: "927864027980",
  appId: "1:927864027980:web:3fb30ba2cc8d541e89ede9",
  measurementId: "G-Q8WKGL7MSM"
};

let appPromise = null;
const getFirebaseApp = async () => {
  if (!appPromise) {
    appPromise = import("firebase/app").then(({ initializeApp }) => initializeApp(firebaseConfig));
  }
  return appPromise;
};

export const initAnalytics = async () => {
  if (typeof window === "undefined") return null;
  try {
    const app = await getFirebaseApp();
    const { getAnalytics } = await import("firebase/analytics");
    return getAnalytics(app);
  } catch (_) {
    return null;
  }
};

let messagingPromise = null;

export const getMessagingInstance = async () => {
  try {
    if (typeof window === "undefined") return null;
    const { isSupported, getMessaging } = await import("firebase/messaging");
    const supported = await isSupported();
    if (!supported) return null;

    if (!messagingPromise) {
      messagingPromise = getFirebaseApp().then((app) => getMessaging(app));
    }
    return messagingPromise;
  } catch (_) {
    return null;
  }
  return null;
};

export const getFcmToken = async (messaging, options) => {
  const { getToken } = await import("firebase/messaging");
  return getToken(messaging, options);
};
