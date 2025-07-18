import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { MoneyService } from '../../services/money.service';
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

  constructor(
    public authService: AuthService,
    private moneyService: MoneyService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() || '';
    this.loadMoney();
  }

  click() {
    this.clickAmount += 1;
    this.deposited = false;
  }

  deposit() {
    if (!this.username || this.clickAmount === 0) return;

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
    this.http.get<{ money: number }>(`https://outside-between.onrender.com/api/profile/${this.username}`).subscribe({
      next: (res) => this.money = res.money,
      error: (err) => console.error('❌ Fehler beim Laden des Gelds:', err)
    });
  }
}