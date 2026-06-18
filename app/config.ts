// app/config.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
// `getReactNativePersistence` existe dans le build React Native de firebase/auth
// mais n'est pas déclaré dans ses types (.d.ts) en v11 → import séparé toléré côté types.
// @ts-expect-error -- absent des types firebase/auth v11, présent au runtime (build RN)
import { getReactNativePersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAdbZ2AASmBINz-Qc7fEKf3z_yJHiyJMAU',
  authDomain: 'invoicesdev-1606d.firebaseapp.com',
  projectId: 'invoicesdev-1606d',
  storageBucket: 'invoicesdev-1606d.firebasestorage.app',
  messagingSenderId: '433550247313',
  appId: '1:433550247313:web:3e2d0c4421fe52a88ec630',
};

const app = initializeApp(firebaseConfig);

// Persistance de la session via AsyncStorage (sinon Firebase Auth utilise la
// mémoire et l'utilisateur est déconnecté à chaque redémarrage de l'app).
// Le try/catch évite le crash « auth already initialized » sur Fast Refresh.
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

export { auth };
