import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { Title, Meta } from '@angular/platform-browser';


@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, SidebarComponent, TopbarComponent],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss'],
})
export class AboutComponent {

constructor(private titleService: Title, private metaService: Meta){}

  ngOnInit(): void {
    this.setSeoTags();
  }

  setSeoTags(): void {
    this.titleService.setTitle('About - CardCore');
  
    this.metaService.updateTag({ name: 'description', content: 'Informationen über den CardCore-Entwickler' });
  
    this.metaService.updateTag({ property: 'og:title', content: 'About - CardCore' });
  
    this.metaService.updateTag({ property: 'og:description', content: 'Informationen über den CardCore-Entwickler' });
  
    this.metaService.updateTag({ name: 'keywords', content: 'About, CardCore, Developer, Angular' });
  }
  

}
