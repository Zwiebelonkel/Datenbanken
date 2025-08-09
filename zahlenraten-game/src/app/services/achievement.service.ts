import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Renderer2 } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AchievementService {
  constructor(private http: HttpClient, private renderer: Renderer2) {}

  unlockAchievement(userId: string, name: string) {
    return this.http.post<{ unlocked: boolean; name: string }>(
      'https://outside-between.onrender.com/api/unlock',
      {
        userId,
        name,
        description: this.getAchievementDescription(name),
      }
    );
  }

  getAchievementDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'First Game 1️⃣': 'Dein erstes Spiel!',
      'Pechvogel 🐓': '0 Punkte erzielt',
      'Newbie 🐣': 'Du hast 10 Punkte erreicht!',
      'Glückspilz 🍄': 'Du hast 50 Punkte erreicht!',
      'Zahlenmeister 💯': 'Du hast 75 Punkte erreicht!',
      'Rund 🥸': 'Du hast 100 Punkte erreicht!',
      'Göttlicher Segen 👼🏻': 'Du hast 500 Punkte erreicht!',
      'Gambler 🎲': 'Du hast 3 mal richtig geraten ohne ein Leben zu verlieren',
      'Arbeitswoche 🛠️':
      'Du hast 5 mal richtig geraten ohne ein Leben zu verlieren',
      'Strategieprofi 🧭':
      'Du hast 10 mal richtig geraten ohne ein Leben zu verlieren',
      'Magier 🪄': 'Du hast 20 mal richtig geraten ohne ein Leben zu verlieren',
      'Champion 🏆': 'Sei auf dem Leaderboard',
      'Bürgermeister': 'Verbessere dein Dorf',
    };
    return descriptions[name] || 'Erfolg freigeschaltet';
  }

  // Optional: Animationslogik hierher auslagern
  emojiRain(emoji: string, container: HTMLElement, count = 50) {
    for (let i = 0; i < count; i++) {
      const span = this.renderer.createElement('span');
      const text = this.renderer.createText(emoji);
      this.renderer.appendChild(span, text);
      this.renderer.addClass(span, 'emoji-drop');

      const startX = Math.random() * window.innerWidth;
      const delay = Math.random() * 2;

      this.renderer.setStyle(span, 'left', `${startX}px`);
      this.renderer.setStyle(span, 'animationDelay', `${delay}s`);

      this.renderer.appendChild(container, span);

      setTimeout(() => {
        this.renderer.removeChild(container, span);
      }, (3 + delay) * 1000);
    }
  }
}
