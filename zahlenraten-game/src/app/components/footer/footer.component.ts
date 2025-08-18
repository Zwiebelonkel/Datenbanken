// footer.component.ts
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ConsentService } from '../../services/consent.service'; // <—

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
})
export class FooterComponent {
  @Input() fixed = true;
  @Input() appName = 'Outside Between';
  year = new Date().getFullYear();

  constructor(private consent: ConsentService) {}

  openConsent() {
    console.log('Footer: openConsent()'); // Debug
    this.consent.open();
  }
}
