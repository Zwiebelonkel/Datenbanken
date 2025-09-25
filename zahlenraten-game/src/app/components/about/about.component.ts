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

constructor(    private titleService: Title,
  private metaService: Meta){
    this.titleService.setTitle('About - CardCore');
    this.metaService.addTags([
      { property: 'og:title', content: 'About - CardCore' },
    ]);
  }

}
