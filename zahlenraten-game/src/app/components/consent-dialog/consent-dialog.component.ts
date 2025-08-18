import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <— wichtig
import { ConsentService } from '../../services/consent.service';

@Component({
  selector: 'app-consent-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consent-dialog.component.html',
  styleUrls: ['./consent-dialog.component.scss'],
})
export class ConsentDialogComponent {
  ads = false;
  analytics = false;

  constructor(public consent: ConsentService) {
    this.ads = this.consent.prefs$.value.ads;
    this.analytics = this.consent.prefs$.value.analytics;
    this.consent.prefs$.subscribe((p) => {
      this.ads = p.ads;
      this.analytics = p.analytics;
    });
  }

  acceptAll() {
    this.consent.acceptAll();
  }
  rejectNonEssential() {
    this.consent.rejectNonEssential();
  }
  save() {
    this.consent.save({ ads: this.ads, analytics: this.analytics });
  }
  close() {
    this.consent.close();
  }
}
