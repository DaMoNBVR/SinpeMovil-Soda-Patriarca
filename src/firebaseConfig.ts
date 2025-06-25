// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
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