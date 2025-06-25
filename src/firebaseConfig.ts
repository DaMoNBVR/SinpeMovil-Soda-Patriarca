<<<<<<< HEAD
=======
// Import the functions you need from the SDKs you need
>>>>>>> b0e10e61acfebbeb3a6db02e3232dbe1266f6dc9
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
<<<<<<< HEAD
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
=======
  apiKey: "process.env.EXPO_PUBLIC_FIREBASE_API_KEY",
  authDomain: "sinpe-sodapatriarca.firebaseapp.com",
  projectId: "sinpe-sodapatriarca",
  storageBucket: "sinpe-sodapatriarca.firebasestorage.app",
  messagingSenderId: "179036112046",
  appId: "1:179036112046:web:d9c0eac0a63700c956193f",
  measurementId: "G-WEB2F6RWYZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
>>>>>>> b0e10e61acfebbeb3a6db02e3232dbe1266f6dc9
