import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB2-BbxVTDTdhs5EQsHVnyJ8pEoCCF03nU",
  authDomain: "pt-studio-web.firebaseapp.com",
  projectId: "pt-studio-web",
  storageBucket: "pt-studio-web.firebasestorage.app",
  messagingSenderId: "714824638661",
  appId: "1:714824638661:web:fbae016a4e2ff5688410ac",
  measurementId: "G-PR6192ZVMV",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
