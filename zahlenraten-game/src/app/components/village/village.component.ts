import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VillageService } from '../../services/village.service';

@Component({
  standalone: true,
  selector: 'app-village',
  templateUrl: './village.component.html',
  styleUrls: ['./village.component.scss'],
  imports: [CommonModule]
})
export class VillageComponent implements OnInit {
  money = 0;
  earned = 0;
  minutesPassed = 0;
  isLoading = true;

  constructor(private villageService: VillageService) {}

  ngOnInit() {
    this.villageService.collectIncome().subscribe({
      next: (res: { earned: number; minutesPassed: number }) => {
        this.money += res.earned;
        this.earned = res.earned;
        this.minutesPassed = res.minutesPassed;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Fehler beim Abrufen des Einkommens:', err);
        this.isLoading = false;
      }
    });
  }
}