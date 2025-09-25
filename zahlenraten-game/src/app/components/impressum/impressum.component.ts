// src/app/pages/impressum/impressum.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component'
import { TopbarComponent } from '../topbar/topbar.component'
import { Title, Meta } from '@angular/platform-browser';


type Optional<T> = T | null;

interface LegalConfig {
  companyOrName: string; // Firma ODER Vor- & Nachname (privat)
  street: string;
  postalCode: string;
  city: string;
  country: string;
  email: string;
  phone?: Optional<string>;
  ustId?: Optional<string>; // Umsatzsteuer-ID (falls vorhanden)
  handelsregister?: Optional<string>; // z.B. "Amtsgericht Bremen, HRB 12345"
  contentResponsible?: Optional<string>; // Verantwortlich i.S.d. § 55 Abs. 2 RStV
}

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent],
  templateUrl: './impressum.component.html',
  styleUrls: ['./impressum.component.scss'],
})
export class ImpressumComponent {
  constructor(private titleService: Title, private metaService: Meta) {
    this.titleService.setTitle('Impressum - CardCore');
    this.metaService.addTags([
      { name: 'description', content: 'Impressum von CardCore' },
      { property: 'og:title', content: 'Impressum - CardCore' },
      { property: 'og:description', content: 'Impressum von CardCore' },
    ]);
  }
  // TODO: mit deinen echten Daten befüllen
  legal: LegalConfig = {
    companyOrName: 'Jan-Luca Müller', // Firma ODER Vor- & Nachname
    street: 'Pürschweg 22',
    postalCode: '28779',
    city: 'Bremen',
    country: 'Deutschland',
    email: 'lucamuller2004@gmail.com',
    phone: '+49 157 3807 4339',
    ustId: null, // 'DE123456789'
    handelsregister: null, // 'Amtsgericht Bremen, HRB 12345'
    contentResponsible: 'Jan-Luca Müller',
  };
}
