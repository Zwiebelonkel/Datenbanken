import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-clicker',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './clicker.component.html',
  styleUrls: ['./clicker.component.scss']
})
export class ClickerComponent {
  money = 0;

  click() {
    this.money += 1;
  }
}