import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SoundsService {
  private audioCache: { [key: string]: HTMLAudioElement } = {};

  playSound(filename: string, volume: number = 1) {
    const path = `assets/sounds/${filename}`;

    // Cache verwenden, um mehrfaches Laden zu vermeiden
    let audio = this.audioCache[filename];

    if (!audio) {
      audio = new Audio(path);
      this.audioCache[filename] = audio;
    }

    audio.currentTime = 0;
    audio.volume = volume;
    audio.play().catch(err => {
      console.warn(`⚠️ Sound konnte nicht abgespielt werden: ${filename}`, err);
    });
  }
}
