import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VillageService {
  private baseUrl = 'https://outside-between.onrender.com/api';

  constructor(private http: HttpClient, private auth: AuthService) {}

  /**
   * Holt passives Einkommen seit dem letzten Collect
   */
collectIncome() {
  const token = this.auth.getToken();
  const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
  return this.http.get<{ earned: number; minutesPassed: number; villageLevel: number; villagers: any[] }>(
    this.apiUrl, { headers }
  );
}

  /**
   * (Für später) Holt aktuelle Dorf-Daten
   */
  getVillage(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/village`, { headers });
  }

  /**
   * (Für später) Upgradet das Dorf
   */
  upgradeVillage(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/village/upgrade`, {}, { headers });
  }

  /**
   * Baut Authorization-Header mit gespeichertem Token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}