import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // <--- hinzufügen
import { AuthService } from '../../../services/auth.service';
import { ProfileService } from '../../../services/profile.service';
import { Router } from '@angular/router';
import { UserStats } from '../../../services/profile.service'; // Importiere UserStats


@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.scss'], 
  standalone: true,
  imports: [CommonModule],
})
export class AdminPageComponent implements OnInit {
  users: any[] = [];
  scores: any[] = [];
  selectedStats: UserStats | null = null;
  selectedUser: string | null = null;


  constructor(private http: HttpClient, public authService: AuthService, private router: Router, private profileService: ProfileService) {}

ngOnInit(): void {
  const role = this.authService.getRole()?.toLowerCase();
  if (role !== 'admin') {
    this.router.navigate(['/']);
    return;
  }

  this.loadUsers();
  this.loadScores();
}

  loadUsers() {
    this.http.get<any[]>('https://outside-between.onrender.com/api/users').subscribe(data => {
      const current = this.authService.getUsername();
      this.users = data.filter(u => u.username !== current); // Admin ausblenden
    });
  }

  loadScores() {
    this.http.get<any[]>('https://outside-between.onrender.com/api/scores/all').subscribe(data => {
      this.scores = data;
    });
  }

deleteUser(id: number) {
  this.http.delete(`https://outside-between.onrender.com/api/users/${id}`).subscribe(() => {
    this.users = this.users.filter(user => user.id !== id);
  });
}

showProfile(username: string) {
  this.profileService.getUserStats(username).subscribe(
    (stats) => {
      this.selectedStats = stats;
      this.selectedUser = username;
    },
    (error) => {
      console.error('Fehler beim Laden der Stats:', error);
    }
  );
}



  deleteScore(id: number) {
    this.http.delete(`https://outside-between.onrender.com/api/scores/${id}`).subscribe(() => {
      this.loadScores();
    });
  }
}
