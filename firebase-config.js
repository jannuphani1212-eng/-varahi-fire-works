const firebaseConfig = {
  apiKey: "YOUR_EXISTING_API_KEY",
  authDomain: "varahi-fire-works-new.firebaseapp.com",
  projectId: "varahi-fire-works-new",
  storageBucket: "varahi-fire-works-new.firebasestorage.app",
  messagingSenderId: "691684817945",
  appId: "1:691684817945:web:18835943e51d91ffc77e88",
  measurementId: "G-DHLYRHC5L7"
};

export { firebaseConfig };

export const isFirebaseConfigured =
  Boolean(firebaseConfig.apiKey) &&
  Boolean(firebaseConfig.projectId);
