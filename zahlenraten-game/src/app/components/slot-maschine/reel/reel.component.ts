import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reel',
  templateUrl: './reel.component.html',
  styleUrls: ['./reel.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class ReelComponent {
  @Input() symbol: string = '❔';
}
