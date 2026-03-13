import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Replace these with the actual keys from your Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAnmO1Qt2XNZbRLRo6oBtjYl1VX76GcHa0",
  authDomain: "quizy-b24f8.firebaseapp.com",
  projectId: "quizy-b24f8",
  storageBucket: "quizy-b24f8.firebasestorage.app",
  messagingSenderId: "452535880225",
  appId: "1:452535880225:web:e56b7fcdccde8119187160",
  measurementId: "G-Y1RBLRXZEQ",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
