import { Component, OnInit } from '@angular/core';
import { VillageService } from '../../services/village.service';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../loader/loader.component'; // Pfad an

@Component({
  standalone: true,
  selector: 'app-village',
  templateUrl: './village.component.html',
  styleUrls: ['./village.component.scss'],
  imports: [CommonModule, LoaderComponent]
})
export class VillageComponent implements OnInit {
  money = 0;
  earned = 0;
  minutesPassed = 0;
  isLoading = true;

  constructor(
    private villageService: VillageService,
    private profileService: ProfileService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const username = this.auth.getUsername();
    if (!username) return;

    // 1. Geld vom Server (Userprofil)
    this.profileService.getUserStats(username).subscribe({
      next: (stats) => {
        this.money = stats.money;
      }
    });

    // 2. Einkommen seit letztem Collect
    this.villageService.collectIncome().subscribe({
      next: (res) => {
        this.earned = res.earned;
        this.minutesPassed = res.minutesPassed;
        this.money += res.earned; // Optional direkt anzeigen
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Fehler bei collectIncome:', err);
        this.isLoading = false;
      }
    });
  }
}