// src/app/services/firebase.service.ts
import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  constructor() {
const firebaseConfig = {

  apiKey: "AIzaSyBIPS587UNOd2fVQ5X7ZlkDwtt6KLfvtJ0",

  authDomain: "outside---between.firebaseapp.com",

  projectId: "outside---between",

  storageBucket: "outside---between.firebasestorage.app",

  messagingSenderId: "114878087192",

  appId: "1:114878087192:web:47cd6ffa90213e480c836d",

  measurementId: "G-KJEW4NC4SV"

};


    const app = initializeApp(firebaseConfig);
    getAnalytics(app);
  }
}
