import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // <--- HINZUFÜGEN

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [FormsModule, CommonModule, RouterModule]
})

export class LoginComponent {
  username = '';
  password = '';
  error = false;
  isLoading = false;

  constructor(private http: HttpClient, private router: Router) {}

login() {
  this.isLoading = true; // Spinner starten

  this.http.post<{ success: boolean, token?: string, message?: string }>(
    'https://outside-between.onrender.com/api/login',
    {
      username: this.username,
      password: this.password
    },
    {
      headers: { 'Content-Type': 'application/json' }
    }
  ).subscribe({
    next: (res) => {
      this.isLoading = false; // Spinner stoppen

      if (res.success) {
        if (res.token) {
          localStorage.setItem('token', res.token);
        }
        this.router.navigate(['/']); // z. B. Spielseite oder Dashboard
      } else {
        this.error = true;
      }
    },
    error: (err) => {
      this.isLoading = false; // Spinner stoppen auch bei Fehler
      this.error = true;
      console.error('Login-Fehler:', err);
    }
  });
}

}
