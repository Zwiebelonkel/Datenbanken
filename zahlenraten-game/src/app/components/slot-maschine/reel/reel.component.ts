// reel.component.ts
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-reel',
  templateUrl: './reel.component.html',
  styleUrls: ['./reel.component.scss']
})
export class ReelComponent {
  @Input() symbol: string = '❔';
}
