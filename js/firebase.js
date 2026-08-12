import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";

import {
  getDatabase
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyCnDzhefAQWgoShNY2geSFwxTzNwqUqvTU",
  authDomain: "verlanglijst-12015.firebaseapp.com",
  databaseURL: "https://verlanglijst-12015-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "verlanglijst-12015",
  storageBucket: "verlanglijst-12015.firebasestorage.app",
  messagingSenderId: "512971362808",
  appId: "1:512971362808:web:b16ec8341ec4fbe795460d"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);
export const auth = getAuth(app);
