// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA2iJ7TazN1FHEgiMN9MgcRYJLoeipynWM",
  authDomain: "its-portfolio.firebaseapp.com",
  projectId: "its-portfolio",
  storageBucket: "its-portfolio.appspot.com",
  messagingSenderId: "815909155470",
  appId: "1:815909155470:web:b33ad7ce9a7ab45efbcfdf",
  measurementId: "G-XCC8FRLB63"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);