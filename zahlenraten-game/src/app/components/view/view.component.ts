import { Component, Input, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-model-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button *ngIf="!showModel" (click)="showModel = true">Modell laden</button>

    <model-viewer
      *ngIf="showModel"
      camera-orbit="-30deg 100deg 8m"
      [src]="src"
      [poster]="poster"
      camera-controls
      interaction-prompt="none"
      auto-rotate
      auto-rotate-delay="500"
      rotation-per-second="20deg"
      style="width: 100%; height: 500px"
      alt="3D Modell"
    ></model-viewer>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ModelViewerComponent {
  @Input() src!: string; // Input Property für die URL / den Pfad
  @Input() poster!: string; // Input Property für die URL / den Pfad

  showModel = true;
}
