import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, map, of, tap } from 'rxjs';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'https://outside-between.onrender.com/api';

  constructor(private http: HttpClient, private router: Router) {}

  login(username: string, password: string) {
    return this.http
      .post<{ token: string }>(`${this.apiUrl}/login`, { username, password })
      .pipe(tap((res) => this.storeToken(res.token)));
  }

  /** Immer boolean liefern */
  loginGuest(): Observable<boolean> {
    return this.login('Gast', 'gast').pipe(
      map(() => true),
      catchError((err) => {
        console.warn('Gast-Login fehlgeschlagen:', err);
        return of(false);
      })
    );
  }

  register(username: string, password: string) {
    return this.http.post(`${this.apiUrl}/register`, { username, password });
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');

    // nach Logout direkt wieder Gast versuchen (ohne Route „/login“)
    this.loginGuest().subscribe({
      next: () => this.router.navigateByUrl('/'),
      error: () => this.router.navigateByUrl('/'),
    });
  }

  /** Immer Observable<boolean> zurückgeben */
  ensureAuth(): Observable<boolean> {
    if (!this.isLoggedIn()) {
      return this.loginGuest(); // -> boolean
    }
    return of(true); // -> boolean
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

  private storeToken(token: string) {
    localStorage.setItem('token', token);
    const decoded = this.decodeToken(token);
    const expiry = decoded.exp * 1000;
    localStorage.setItem('tokenExpiry', expiry.toString());
  }

  private decodeToken(token: string): any {
    return JSON.parse(atob(token.split('.')[1]));
  }
}