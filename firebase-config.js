// Replace these placeholder values with your Firebase project's Web App configuration.
// Firebase web config is public by design. Protect data with Firebase Authentication and Security Rules.
export const firebaseConfig = {
  apiKey: "REPLACE_WITH_API_KEY",
  authDomain: "REPLACE_WITH_PROJECT_ID.firebaseapp.com",
  projectId: "REPLACE_WITH_PROJECT_ID",
  storageBucket: "REPLACE_WITH_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_APP_ID"
};
export const isFirebaseConfigured = !Object.values(firebaseConfig).some(v => String(v).startsWith("REPLACE_WITH"));