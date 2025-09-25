import { Component } from '@angular/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { Title, Meta } from '@angular/platform-browser';


@Component({
  selector: 'app-how-to-play',
  templateUrl: './how-to-play.component.html',
  styleUrls: ['./how-to-play.component.scss'],
  imports: [SidebarComponent, TopbarComponent],
})
export class HowToPlayComponent {

  constructor(    private titleService: Title,
    private metaService: Meta){
      this.titleService.setTitle('HowToPlay - CardCore');
      this.metaService.addTags([
        { name: 'description', content: 'Hier siehst du wie das gesamte Spiel funktioniert.' },
        { property: 'og:title', content: 'HowToPlay - CardCore' },
        { property: 'og:description', content: 'ier siehst du wie das gesamte Spiel funktioniert.' },
      ]);
    }
}
