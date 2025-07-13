import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-achievements',
  templateUrl: './achievements.component.html',
  styleUrls: ['./achievements.component.scss'],
  imports: [CommonModule],
  standalone: true
})
export class AchievementsComponent implements OnInit {
  achievements: any[] = [];

  constructor(private http: HttpClient, private authService: AuthService) {}

ngOnInit(): void {
  const username = this.authService.getUsername();
  this.http.get<any[]>(`https://outside-between.onrender.com/api/achievements?username=${username}`)
    .subscribe(data => {
      console.log('Erhaltene Achievements:', data);
      this.achievements = data;
    });
}

}
