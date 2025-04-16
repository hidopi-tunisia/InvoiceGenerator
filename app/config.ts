// app/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// Importez d'autres services Firebase si nécessaire (Firestore, etc.)

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  // measurementId: "YOUR_MEASUREMENT_ID" // Facultatif
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Exportez d'autres instances de service si nécessaire