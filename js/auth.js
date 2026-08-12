import { auth } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";


export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}


export async function logout() {
  return signOut(auth);
}


export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}


export function getCurrentUser() {
  return auth.currentUser;
}