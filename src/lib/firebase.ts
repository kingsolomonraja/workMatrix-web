import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCpVTpBAcfINi3pAPqjqG-jBW7EZ29i8yA",
  authDomain: "workmatrix-f113b.firebaseapp.com",
  projectId: "workmatrix-f113b",
  storageBucket: "workmatrix-f113b.firebasestorage.app",
  messagingSenderId: "280366040072",
  appId: "1:280366040072:web:06bb92368fd87ae915bdbd",
  measurementId: "G-B3Q1L3ZD1C"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
