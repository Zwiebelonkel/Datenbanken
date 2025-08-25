import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'https://outside-between.onrender.com/api';

  constructor(private http: HttpClient, private router: Router) {}

  // Normales Login (bleibt wie gehabt)
  login(username: string, password: string) {
    return this.http
      .post<{ token: string }>(`${this.apiUrl}/login`, { username, password })
      .pipe(
        tap((res) => this.storeToken(res.token))
      );
  }

  // 🟢 Auto-Gast-Login
  loginGuest() {
    return this.login('Gast', 'gast').pipe(
      // Falls aus irgendeinem Grund der Gast-Login fehlschlägt,
      // lassen wir die App trotzdem nicht auf /login hängen.
      catchError((err) => {
        console.warn('Gast-Login fehlgeschlagen:', err);
        // Minimaler Fallback: leeres "Gast"-Profil ohne Token (nur wenn du willst)
        // localStorage.removeItem('token'); localStorage.removeItem('tokenExpiry');
        return of(null);
      })
    );
  }

  register(username: string, password: string) {
    return this.http.post(`${this.apiUrl}/register`, { username, password });
  }

  // ⛔️ Statt zur Login-Seite: direkt wieder als Gast einloggen
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');

    this.loginGuest().subscribe({
      next: () => {
        // WICHTIG: Nicht auf /login, sondern auf Startseite oder aktuelle Seite
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.router.navigateByUrl('/'); // Fallback
      },
    });
  }

  // Beim App-Start/Guard aufrufen: wenn nicht eingeloggt/Token abgelaufen -> Gast
  ensureAuth() {
    if (!this.isLoggedIn()) {
      return this.loginGuest();
    }
    return of(true);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    const expiry = Number(localStorage.getItem('tokenExpiry'));

    if (!token || !expiry) return false;

    if (Date.now() > expiry) {
      // Token ist abgelaufen -> NICHT zu /login, sondern direkt Gast-Login
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
    const expiry = decoded.exp * 1000; // in ms
    localStorage.setItem('tokenExpiry', expiry.toString());
  }

  private decodeToken(token: string): any {
    return JSON.parse(atob(token.split('.')[1]));
  }
}