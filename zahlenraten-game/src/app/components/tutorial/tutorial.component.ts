import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  imports: [CommonModule],
  selector: 'app-tutorial',
  standalone: true,
  templateUrl: './tutorial.component.html',
  styleUrls: ['./tutorial.component.scss'],
})
export class TutorialComponent {
  @Input() title: string = 'Wie funktioniert das?';
  @Input() description: string = '';
  @Input() skills: { name: string; emoji: string; description: string }[] = [];
}
