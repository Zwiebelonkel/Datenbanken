import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { LoaderComponent } from '../loader/loader.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-achievements',
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.scss'],
  imports: [CommonModule, SidebarComponent, TopbarComponent, LoaderComponent],
  standalone: true,
})
export class AchievementsComponent implements OnInit {
  achievements: any[] = [];
  isLoading = true;

  constructor(private http: HttpClient, private authService: AuthService) {}

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
