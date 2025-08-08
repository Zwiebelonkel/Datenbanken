@Injectable({
  providedIn: 'root',
})
export class AchievementService {
  constructor(private http: HttpClient, private soundService: SoundsService, private renderer: Renderer2) {}

  unlockAchievement(userId: string, name: string) {
    return this.http.post<{ unlocked: boolean; name: string }>(
      'https://outside-between.onrender.com/api/unlock',
      {
        userId,
        name,
        description: this.getDescription(name),
      }
    );
  }

  getDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'First Game 1️⃣': 'Dein erstes Spiel!',
      'Pechvogel 🐓': '0 Punkte erzielt',
      // ...
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
