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
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || '';
    this.loadMoney();
    this.startEmojiRain("❤️")
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

startEmojiRain(emoji: string) {
  const count = 30; // Anzahl der fallenden Emojis

  for (let i = 0; i < count; i++) {
    const span = document.createElement('span');
    span.textContent = emoji;
    span.style.position = 'fixed';
    span.style.top = '-50px';
    span.style.left = `${Math.random() * 100}vw`;
    span.style.fontSize = `${Math.random() * 20 + 24}px`;
    span.style.pointerEvents = 'none';
    span.style.zIndex = '9999';
    span.style.animation = `emojiFall ${Math.random() * 2 + 3}s linear forwards`;

    document.body.appendChild(span);

    // Entferne nach Animation
    setTimeout(() => span.remove(), 6000);
  }
}
}