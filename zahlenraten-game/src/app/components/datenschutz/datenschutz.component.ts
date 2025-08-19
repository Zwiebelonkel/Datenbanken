// src/app/pages/datenschutz/datenschutz.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component'
import { TopbarComponent } from '../topbar/topbar.component'


interface PrivacyConfig {
  controllerName: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;

  usesFirebaseHosting: boolean;
  usesFirebaseAuth: boolean;
  usesFirestore: boolean;
  usesStorage: boolean;
  usesFunctions: boolean;

  usesAdSense: boolean; // Web-Werbung
  usesAdMob: boolean; // Mobile App-Werbung
  usesAnalytics: boolean; // z. B. Google Analytics (optional)

  cmpName?: string; // Name deiner Consent-Lösung (optional)
}

@Component({
  selector: 'app-datenschutz',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent],
  templateUrl: './datenschutz.component.html',
  styleUrls: ['./datenschutz.component.scss'],
})
export class DatenschutzComponent {
  // TODO: mit deinen echten Daten/Flags befüllen
  cfg: PrivacyConfig = {
    controllerName: 'Jan-Luca Müller',
    street: 'Pürschweg 22',
    postalCode: '28779',
    city: 'Bremen',
    country: 'Deutschland',
    email: 'lucamuller2004@gmail.com',

    usesFirebaseHosting: true,
    usesFirebaseAuth: true,
    usesFirestore: true,
    usesStorage: true,
    usesFunctions: false,

    usesAdSense: true,
    usesAdMob: true,
    usesAnalytics: false,

    cmpName: 'Cookie/Consent-Banner',
  };

  today = new Date(); // für "Stand"
}
