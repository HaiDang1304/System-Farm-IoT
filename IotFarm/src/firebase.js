// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword ,sendEmailVerification, signInWithEmailAndPassword } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, setDoc } from "firebase/firestore";



const firebaseConfig = {
  apiKey: "AIzaSyD4gCLnG_S0zYlioxIir70ETjtSou7qXug",
  authDomain: "iot-farm-9f505.firebaseapp.com",
  projectId: "iot-farm-9f505",
  storageBucket: "iot-farm-9f505.appspot.com",
  messagingSenderId: "388341795215",
  appId: "1:388341795215:web:ce74ab33b6bc45729523fa",
  measurementId: "G-WVEGSGZ6NN"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");

const analytics = getAnalytics(app);
const db = getFirestore(app);



export { auth, provider, signInWithPopup, signOut, analytics, db, doc, setDoc, createUserWithEmailAndPassword, sendEmailVerification, signInWithEmailAndPassword};
