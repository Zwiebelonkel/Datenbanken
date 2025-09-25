import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { Title, Meta} from '@angular/platform-browser';


@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
})
export class ContactComponent {
  constructor(    private titleService: Title, private metaService: Meta
  ){    this.titleService.setTitle('Contact');
    this.metaService.addTags([
      { property: 'og:title', content: 'Contact - CardCore' },
    ]);
  }
}
