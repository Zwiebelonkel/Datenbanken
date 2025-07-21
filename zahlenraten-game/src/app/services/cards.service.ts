import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CardsService {
  private baseUrl = 'https://outside-between.onrender.com/api/cards';

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Alle Karten für aktuellen User abrufen
  getCards(): Observable<any[]> {
    const username = this.authService.getUsername();
    return this.http.get<any[]>(`${this.baseUrl}?username=${username}`);
  }

  // Neue Karte hinzufügen
  addCard(multiplier: number, amount: number = 1): Observable<any> {
    const username = this.authService.getUsername();
    return this.http.post<any>(this.baseUrl, {
      username,
      multiplier,
      amount
    });
  }

  // Eine Karte verbrauchen (Menge um 1 verringern)
  useCard(multiplier: number): Observable<any> {
    const username = this.authService.getUsername();
    return this.http.put<any>(`${this.baseUrl}/use`, {
      username,
      multiplier
    });
  }
}
