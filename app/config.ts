// app/config.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
// Importez d'autres services Firebase si nécessaire (Firestore, etc.)

const firebaseConfig = {
  apiKey: "AIzaSyAdbZ2AASmBINz-Qc7fEKf3z_yJHiyJMAU",
  authDomain: "invoicesdev-1606d.firebaseapp.com",
  projectId: "invoicesdev-1606d",
  storageBucket: "invoicesdev-1606d.firebasestorage.app",
  messagingSenderId: "433550247313",
  appId: "1:433550247313:web:3e2d0c4421fe52a88ec630",
  // measurementId: "YOUR_MEASUREMENT_ID" // Facultatif
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Exportez d'autres instances de service si nécessaire