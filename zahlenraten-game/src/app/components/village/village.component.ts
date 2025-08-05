import { Component, OnInit } from '@angular/core';
import { VillageService } from '../services/village.service';

@Component({
  selector: 'app-village',
  templateUrl: './village.component.html',
  styleUrls: ['./village.component.scss']
})
export class VillageComponent implements OnInit {
  money = 0;
  earned = 0;
  minutesPassed = 0;
  isLoading = true;

  constructor(private villageService: VillageService) {}

  ngOnInit() {
    this.villageService.collectIncome().subscribe({
      next: (res) => {
        this.earned = res.earned;
        this.minutesPassed = res.minutesPassed;
        this.money += res.earned;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Fehler beim Laden:', err);
        this.isLoading = false;
      }
    });
  }
}