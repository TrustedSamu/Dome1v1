import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDHSoNz_8w1V-sU1PIDIg5SFJh40Z810-c",
    authDomain: "dome-app-cebdc.firebaseapp.com",
    projectId: "dome-app-cebdc",
    storageBucket: "dome-app-cebdc.firebasestorage.app",
    messagingSenderId: "558166094687",
    appId: "1:558166094687:web:dca41f9ab97c7ac4ab3cea"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); 