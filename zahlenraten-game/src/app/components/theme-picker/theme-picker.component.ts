import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';
@Component({
  selector: 'app-theme-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="picker">
      <span>Akzent:</span>
      <input type="color" [value]="accent" (input)="onPick($event)" />
      <button type="button" class="btn" (click)="dark(true)">🌙</button>
      <button type="button" class="btn" (click)="dark(false)">☀️</button>
    </label>
  `,
  styles: [
    `
      .picker {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      input[type='color'] {
        width: 2.25rem;
        height: 2.25rem;
        border: none;
        padding: 0;
        background: none;
        cursor: pointer;
      }
      .btn {
        background: var(--theme);
        color: #fff;
        border: 0;
        border-radius: 8px;
        padding: 0.35rem 0.6rem;
        cursor: pointer;
      }
    `,
  ],
})
export class ThemePickerComponent implements OnInit {
  accent = '#5eb761';
  constructor(private theme: ThemeService) {}

  ngOnInit() {
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue('--theme')
      .trim();
    if (val) this.accent = val;
  }

  onPick(e: Event) {
    const hex = (e.target as HTMLInputElement).value;
    this.accent = hex;
    this.theme.setAccent(hex);
  }

  dark(on: boolean) {
    this.theme.enableDarkMode(on);
  }
}
