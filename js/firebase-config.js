// js/firebase-config.js
// Firebase initialization — imported by all other JS files via ES module scripts

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey:            "AIzaSyCbwCy-xMyLvdOcxYvt62jqcpkfmxFr670",
  authDomain:        "studenthub-server.firebaseapp.com",
  projectId:         "studenthub-server",
  storageBucket:     "studenthub-server.firebasestorage.app",
  messagingSenderId: "662272949703",
  appId:             "1:662272949703:web:73aed777819f12bca3ade2",
  measurementId:     "G-ETXJ8G6DMD"
};

const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const db        = getFirestore(app);
const analytics = getAnalytics(app);

export { app, auth, db, analytics };