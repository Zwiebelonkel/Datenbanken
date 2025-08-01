import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'https://outside-between.onrender.com/api/';

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string) {
    return this.http
      .post<{ token: string }>(`${this.apiUrl}/login`, {
        username,
        password,
      })
      .pipe(
        // Ablaufzeit speichern
        tap((res) => {
          localStorage.setItem('token', res.token);
          const decoded = this.decodeToken(res.token);
          const expiry = decoded.exp * 1000; // in ms
          localStorage.setItem('tokenExpiry', expiry.toString());
        })
      );
  }

  register(username: string, password: string) {
    return this.http.post(`${this.apiUrl}/register`, { username, password });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    const expiry = Number(localStorage.getItem('tokenExpiry'));

    if (!token || !expiry) return false;

    if (Date.now() > expiry) {
      this.logout();
      return false;
    }

    return true;
  }

  getToken(): string | null {
    return this.isLoggedIn() ? localStorage.getItem('token') : null;
  }

  getUsername(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return this.decodeToken(token).username;
    } catch {
      return null;
    }
  }

  getUserId(): number | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return this.decodeToken(token).id;
    } catch {
      return null;
    }
  }

  getRole(): string | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return this.decodeToken(token).role;
    } catch {
      return null;
    }
  }

  private decodeToken(token: string): any {
    return JSON.parse(atob(token.split('.')[1]));
  }
}
