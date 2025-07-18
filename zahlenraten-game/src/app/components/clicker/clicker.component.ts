import { Renderer2 } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { MoneyService } from '../../services/money.service';
import { ProfileService } from '../../services/profile.service';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-clicker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clicker.component.html',
  styleUrls: ['./clicker.component.scss']
})
export class ClickerComponent implements OnInit {
  clickAmount = 0;
  money = 0;
  username: string = '';
  deposited = false;
  isLoading = true;
  flashActive = false;
  floatingMoney: { x: number; y: number }[] = [];

  constructor(
    public authService: AuthService,
    private moneyService: MoneyService,
    private profileService: ProfileService,
    private http: HttpClient,
    private renderer: Renderer2
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || '';
    this.loadMoney();
    this.emojiRain("❤️")
  }

  click() {
  this.clickAmount += 1;
  this.deposited = false;

  // Farbblitz
  this.flashActive = true;
  setTimeout(() => this.flashActive = false, 400);

  const button = document.querySelector('.click-button') as HTMLElement;
  const wrapper = document.querySelector('.click-wrapper') as HTMLElement;
  if (!button || !wrapper) return;

  const buttonRect = button.getBoundingClientRect();
  const wrapperRect = wrapper.getBoundingClientRect();

  // 💸 Startposition ist Mitte des Buttons, relativ zum Wrapper
  const centerX = buttonRect.left - wrapperRect.left + buttonRect.width / 2;
  const centerY = buttonRect.top - wrapperRect.top + buttonRect.height / 2;

  // Zufälliger Versatz (optischer Effekt)
  const offsetX = (Math.random() - 0.5) * 80; // -40 bis +40
  const offsetY = (Math.random() - 0.5) * 80; // -40 bis +40

  this.floatingMoney.push({ x: centerX + offsetX, y: centerY + offsetY });

  // Nach 1s entfernen
  setTimeout(() => this.floatingMoney.shift(), 1000);
}

  deposit() {
    if (!this.username || this.clickAmount === 0) return;
    this.isLoading = true;
    this.moneyService.updateMoney({ username: this.username, amount: this.clickAmount }).subscribe({
      next: () => {
        this.deposited = true;
        this.clickAmount = 0;
        this.loadMoney(); // 💰 neu laden!
      },
      error: err => console.error('❌ Fehler beim Einzahlen:', err)
    });
  }

loadMoney() {
  this.profileService.getUserStats(this.username).subscribe({
    next: stats => {
      this.money = stats.money;
      this.isLoading = false;
    },
    error: err => {
      console.error('Fehler beim Laden der Statistiken', err);
      this.isLoading = false;
    }
  });
}

emojiRain(emoji: string, count: number = 20) {
  const container = document.querySelector('.emoji-rain-container');
  if (!container) return;

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
    }, 3500);
  }
}
}