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
  imports: [FormsModule, CommonModule, RouterModule]
})

export class LoginComponent {
  username = '';
  password = '';
  error = false;

  constructor(private http: HttpClient, private router: Router) {}

  login() {
    this.http.post<{ success: boolean, token?: string, message?: string }>('http://localhost:3000/api/login', {
      username: this.username,
      password: this.password
    }).subscribe({
      next: (res) => {
        if (res.success) {
          if (res.token) {
            localStorage.setItem('token', res.token);
          }
          this.router.navigate(['/']); // z. B. Spielseite
        } else {
          this.error = true;
        }
      },
      error: (err) => {
        this.error = true;
        console.error('Login-Fehler:', err);
      }
    });
  }
}
