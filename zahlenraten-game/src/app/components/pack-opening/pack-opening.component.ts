import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pack-opening',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pack-opening.component.html',
  styleUrls: ['./pack-opening.component.scss']
})

export class PackOpeningComponent implements OnInit {
  packName: string = '';
  result: string = '';
  reveal = false;

  // Wahrscheinlichkeiten je Pack
  chances: Record<string, { multiplier: string; chance: number }[]> = {
    Basic: [
      { multiplier: '1.2x', chance: 70 },
      { multiplier: '1.5x', chance: 25 },
      { multiplier: '2x', chance: 5 },
    ],
    Premium: [
      { multiplier: '1.5x', chance: 60 },
      { multiplier: '2x', chance: 30 },
      { multiplier: '5x', chance: 10 },
    ],
    Ultra: [
      { multiplier: '2x', chance: 50 },
      { multiplier: '5x', chance: 50 },
    ]
  };

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.packName = params['pack'] || 'Basic'; // fallback zu Basic
    });
  }

  revealCard() {
    if (this.reveal) return; // doppelklick vermeiden
    this.reveal = true;
    this.drawCard();
  }

  drawCard() {
    const pack = this.chances[this.packName];
    const rand = Math.random() * 100;
    let cumulative = 0;

    for (const entry of pack) {
      cumulative += entry.chance;
      if (rand <= cumulative) {
        this.result = entry.multiplier;
        break;
      }
    }
  }
}