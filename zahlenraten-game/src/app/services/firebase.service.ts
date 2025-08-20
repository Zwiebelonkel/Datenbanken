// src/app/services/firebase.service.ts
import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent, Analytics } from 'firebase/analytics';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private analytics: Analytics;

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
    this.analytics = getAnalytics(app);

    // Optional: Testevent direkt beim Initialisieren senden
  }

  public logEvent(eventName: string, eventParams?: Record<string, any>): void {
    if (this.analytics) {
      logEvent(this.analytics, eventName, eventParams);
    }
  }
}
