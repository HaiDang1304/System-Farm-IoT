import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD4gCLnG_S0zYlioxIir70ETjtSou7qXug",
  authDomain: "iot-farm-9f505.firebaseapp.com",
  projectId: "iot-farm-9f505",
  storageBucket: "iot-farm-9f505.appspot.com",
  messagingSenderId: "388341795215",
  appId: "1:388341795215:web:ce74ab33b6bc45729523fa",
  measurementId: "G-WVEGSGZ6NN",
};

let auth;

if (getApps().length) {
  const existingApp = getApp();
  try {
    auth = getAuth(existingApp);
  } catch (error) {
    auth = initializeAuth(existingApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} else {
  const newApp = initializeApp(firebaseConfig);
  auth = initializeAuth(newApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

const app = getApp();
const db = getFirestore(app);

export { app, auth, db };
