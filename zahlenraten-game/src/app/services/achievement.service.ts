import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { SoundService } from './sound.service';

@Injectable({
  providedIn: 'root',
})
export class AchievementService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private soundService: SoundService
  ) {}

  unlockAchievement(name: string) {
    this.http
      .post<{ unlocked: boolean; name: string }>(
        'https://outside-between.onrender.com/api/unlock',
        {
          userId: this.authService.getUserId(), // holt sich die User-ID dynamisch
          name: name,
          description: this.getAchievementDescription(name),
        }
      )
      .subscribe({
        next: (res) => {
          console.log('📡 SERVER-ANTWORT:', res);
          if (res.unlocked) {
            this.showAchievementMessage(
              `🎉 Erfolg freigeschaltet: ${res.name}`
            );
            console.log('✅ Achievement neu freigeschaltet:', res.name);
            this.emojiRain('🎖️');
            this.soundService.playSound('message.aac');
          } else {
            console.log('ℹ️ Achievement war bereits freigeschaltet:', res.name);
          }
        },
        error: (err) => console.error('❌ Fehler beim Unlock:', err),
      });
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
      'Las Vegas': 'Versuche dein Glück',
      'Lone Wolf': 'Gewinne beim Glücksspiel',
    };
    return descriptions[name] || 'Erfolg freigeschaltet';
  }
}
