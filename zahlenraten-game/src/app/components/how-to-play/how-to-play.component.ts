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
    private metaService: Meta){}

    ngOnInit(): void {
      this.setSeoTags();
    }

    setSeoTags(): void {
      this.titleService.setTitle('HowToPlay - CardCore');
    
      this.metaService.updateTag({ name: 'description', content: 'Hier siehst du wie das gesamte Spiel funktioniert.' });
    
      this.metaService.updateTag({ property: 'og:title', content: 'HowToPlay - CardCore' });
    
      this.metaService.updateTag({ property: 'og:description', content: 'Hier siehst du wie das gesamte Spiel funktioniert.' });
    
      this.metaService.updateTag({ name: 'keywords', content: 'Tutorial, CardCore, Erklärung, Spielleitung'});
    }
}
