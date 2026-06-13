import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAptVHTE99L6xqg18L3nRd1vLu5vppcxc8",
  authDomain: "constant-drive.firebaseapp.com",
  projectId: "constant-drive",
  storageBucket: "constant-drive.firebasestorage.app",
  messagingSenderId: "248624922734",
  appId: "1:248624922734:web:0550ec200b6ed7019ae67f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
