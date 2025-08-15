import { Component, Renderer2 } from '@angular/core';

@Component({
  selector: 'app-rain',
  standalone: true,
  templateUrl: './rain.component.html',
  styleUrls: ['./rain.component.scss'],
})
export class RainComponent {
  constructor(private renderer: Renderer2) {}

  emojiRain(emoji: string, count: number = 50) {
    const container = document.querySelector('.emoji-rain-container');
    if (!container) return;

    for (let i = 0; i < count; i++) {
      const span = this.renderer.createElement('span');
      const text = this.renderer.createText(emoji);
      this.renderer.appendChild(span, text);
      this.renderer.addClass(span, 'emoji-drop');

      const startX = Math.random() * window.innerWidth;
      const delay = Math.random() * 2;

      this.renderer.setStyle(span, 'left', `${startX}px`);
      this.renderer.setStyle(span, 'animationDelay', `${delay}s`);

      this.renderer.appendChild(container, span);

      setTimeout(() => {
        this.renderer.removeChild(container, span);
      }, (3 + delay) * 1000);
    }
  }
}
