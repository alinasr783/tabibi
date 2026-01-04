// Give the service worker access to Firebase Messaging.
// Note that you can only use Firebase Messaging here. Other Firebase libraries
// are not available in the service worker.
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyAQlHGe62U0s5FhsJ4u1eBpOFhwAYvnCeg",
  authDomain: "tabibi-813f7.firebaseapp.com",
  projectId: "tabibi-813f7",
  storageBucket: "tabibi-813f7.firebasestorage.app",
  messagingSenderId: "927864027980",
  appId: "1:927864027980:web:3fb30ba2cc8d541e89ede9",
  measurementId: "G-Q8WKGL7MSM"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.jpeg' // Using the logo from public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
