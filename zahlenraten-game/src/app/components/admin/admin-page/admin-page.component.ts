import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common'; // <--- hinzufügen
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-admin-page',
  templateUrl: './admin-page.component.html',
  styleUrls: ['./admin-page.component.scss'], 
  standalone: true,
  imports: [CommonModule], // <--- hier einfügen
})
export class AdminPageComponent implements OnInit {
  users: any[] = [];
  scores: any[] = [];

  constructor(private http: HttpClient, public authService: AuthService, private router: Router) {}

ngOnInit(): void {
  const role = this.authService.getRole()?.toLowerCase();
  if (role !== 'admin') {
    this.router.navigate(['/']); // oder z.B. '/login'
    return;
  }

  this.loadUsers();
  this.loadScores();
}

  loadUsers() {
    this.http.get<any[]>('http://localhost:3000/api/users').subscribe(data => {
      const current = this.authService.getUsername();
      this.users = data.filter(u => u.username !== current); // Admin ausblenden
    });
  }

  loadScores() {
    this.http.get<any[]>('http://localhost:3000/api/scores/all').subscribe(data => {
      this.scores = data;
    });
  }

deleteUser(id: number) {
  this.http.delete(`http://localhost:3000/api/users/${id}`).subscribe(() => {
    this.users = this.users.filter(user => user.id !== id);
  });
}


  deleteScore(id: number) {
    this.http.delete(`http://localhost:3000/api/scores/${id}`).subscribe(() => {
      this.loadScores();
    });
  }
}
