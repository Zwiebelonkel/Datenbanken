import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';


@Component({
  selector: 'app-offline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './offline.component.html',
  styleUrls: ['./offline.component.scss'],
})
export class OfflineComponent {

  constructor(    private titleService: Title,
    private metaService: Meta){
      this.titleService.setTitle('Offline - CardCore');
      this.metaService.addTags([
        { name: 'description', content: 'CardCore ist zurzeit leider offline und kann daher nicht gespielt werden. Grund: Update oder Reboot.' },
        { property: 'og:title', content: 'Offline - CardCore' },
        { property: 'og:description', content: 'CardCore ist zurzeit leider offline und kann daher nicht gespielt werden. Grund: Update oder Reboot.' },
      ]);
    }
}
