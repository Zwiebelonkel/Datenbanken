import { Component } from '@angular/core';
import { Skill } from './skill.model';

@Component({
  selector: 'app-skill-shop',
  templateUrl: './skill-shop.component.html',
  standalone: true,
  styleUrls: ['./skill-shop.component.scss']
})
export class SkillShopComponent {
  skills: Skill[] = [
    { id: 1, name: 'Angular Basics', description: 'Einführung in Angular', price: 29.99, purchased: false },
    { id: 2, name: 'TypeScript Advanced', description: 'Fortgeschrittene TypeScript-Techniken', price: 39.99, purchased: false },
    { id: 3, name: 'RxJS Patterns', description: 'Reaktive Programmierung mit RxJS', price: 34.99, purchased: false },
  ];

  purchase(skill: Skill) {
    if (!skill.purchased) {
      skill.purchased = true;
      alert(`Du hast "${skill.name}" erfolgreich gekauft!`);
    }
  }
}
