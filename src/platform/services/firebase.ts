// src/platform/services/firebase.ts

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getFunctions, type Functions } from "firebase/functions";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import type { Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const requiredFirebaseConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId,
];

const hasFirebaseConfig = requiredFirebaseConfig.every(
  (value) => typeof value === 'string' && value.trim().length > 0,
);
const forceLocalPlatform =
  import.meta.env.DEV && import.meta.env.VITE_EVERMARCH_FORCE_LOCAL_PLATFORM === 'true';

const isLocalPlatformMode = import.meta.env.DEV && (forceLocalPlatform || !hasFirebaseConfig);
const isFirebaseEnabled = hasFirebaseConfig && !isLocalPlatformMode;

const firebaseApp: FirebaseApp | null = isFirebaseEnabled ? initializeApp(firebaseConfig) : null;

let analytics: Analytics | null = null;

if (firebaseApp && typeof window !== 'undefined') {
  import('firebase/analytics')
    .then(async ({ getAnalytics, isSupported }) => {
      const analyticsSupported =
        typeof isSupported === 'function' ? await isSupported() : true;

      if (analyticsSupported) {
        analytics = getAnalytics(firebaseApp);
      }
    })
    .catch(() => {
      analytics = null;
    });
}

const firestore: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;
const auth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
const functions: Functions | null = firebaseApp ? getFunctions(firebaseApp, 'australia-southeast1') : null;
const storage: FirebaseStorage | null = firebaseApp ? getStorage(firebaseApp) : null;

export {
  firestore,
  analytics,
  functions,
  auth,
  storage,
  hasFirebaseConfig,
  isFirebaseEnabled,
  isLocalPlatformMode,
};
