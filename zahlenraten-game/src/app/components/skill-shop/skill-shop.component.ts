import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Wichtig für *ngFor, currency
import { Skill, Player } from './skill.model';

@Component({
  selector: 'app-skill-shop',
  templateUrl: './skill-shop.component.html',
  imports: [CommonModule], // Hier importierst du CommonModule
  standalone: true,
  styleUrls: ['./skill-shop.component.scss']
})
export class SkillShopComponent {
  // Skill-Array mit Multiplikatoren
  skills: Skill[] = [
    { id: 1, name: 'Score Multiplier +1', description: 'Erhöhe deinen Score-Multiplikator um 1x', price: 50, type: 'score', level: 1, purchased: false },
    { id: 2, name: 'Score Multiplier +2', description: 'Erhöhe deinen Score-Multiplikator um 2x', price: 100, type: 'score', level: 2, purchased: false },
    { id: 3, name: 'Monetary Multiplier +0.5x', description: 'Erhöhe deinen monetären Multiplikator um 0.5x', price: 40, type: 'money', level: 1, purchased: false },
    { id: 4, name: 'Monetary Multiplier +1x', description: 'Erhöhe deinen monetären Multiplikator um 1x', price: 80, type: 'money', level: 2, purchased: false },
  ];

  // Spieler-Objekt mit Skillpunkten und Multiplikatoren
  player: Player = {
    skillPoints: 200, // Anfangs Skillpunkte
    scoreMultiplier: 1.0,
    monetaryMultiplier: 1.0,
  };

  // Funktion zum Kaufen von Skills
  purchase(skill: Skill) {
    if (!skill.purchased && this.player.skillPoints >= skill.price) {
      skill.purchased = true;
      this.player.skillPoints -= skill.price;

      // Multiplikatoren upgraden basierend auf Skill-Typ
      if (skill.type === 'score') {
        this.player.scoreMultiplier += skill.level;
      } else if (skill.type === 'money') {
        this.player.monetaryMultiplier += skill.level * 0.5; // Beispiel für Monetär
      }

      alert(`Du hast "${skill.name}" erfolgreich gekauft!`);
    } else {
      alert('Nicht genug Skillpunkte oder bereits gekauft!');
    }
  }
}
