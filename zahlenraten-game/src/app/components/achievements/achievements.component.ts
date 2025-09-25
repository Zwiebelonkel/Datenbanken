import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { LoaderComponent } from '../loader/loader.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { TutorialComponent } from '../tutorial/tutorial.component';
import { Title, Meta } from '@angular/platform-browser';


@Component({
  selector: 'app-achievements',
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.scss'],
  imports: [
    CommonModule,
    SidebarComponent,
    TopbarComponent,
    LoaderComponent,
    TutorialComponent,
  ],
  standalone: true,
})
export class AchievementsComponent implements OnInit {
  achievements: any[] = [];
  isLoading = true;

  tutorialTitle = 'Wie funktioniert das?';
  tutorialDescription =
    'Hier befinden sich alle Meilensteine, die du im Spiel erreichen kannst. Das Freischalten von Erfolgen gibt ausserdem einen Bonus von 20XP!';

  constructor(private http: HttpClient, private authService: AuthService,    private titleService: Title,
    private metaService: Meta
) {    this.titleService.setTitle('Erfolge - CardCore');
  this.metaService.addTags([
    { name: 'description', content: 'Siehe hier nach, welche Erfolge du bereits freigeschaltet hast.' },
    { property: 'og:title', content: 'Erfolge - CardCore' },
    { property: 'og:description', content: 'Siehe hier nach, welche Erfolge du bereits freigeschaltet hast.' },
  ]);}

  ngOnInit(): void {
    const username = this.authService.getUsername();
    this.http
      .get<any[]>(
        `https://outside-between.onrender.com/api/achievements?username=${username}`
      )
      .subscribe(
        (data) => {
          this.achievements = data;
          this.isLoading = false;
        },
        (error) => {
          this.isLoading = false;
        }
      );
  }
}
