import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VillageService {
  private baseUrl = 'https://outside-between.onrender.com/api/village';

  constructor(private http: HttpClient, private auth: AuthService) {}

  /**
   * Holt passives Einkommen seit dem letzten Collect
   */
collectIncome(): Observable<{
  earned: number;
  minutesPassed: number;
  villageLevel: number;
  villagers: {
    id: number;
    name: string;
    level: number;
    income: number;
  }[];
}> {
  const headers = this.getAuthHeaders();
  return this.http.get<{
    earned: number;
    minutesPassed: number;
    villageLevel: number;
    villagers: {
      id: number;
      name: string;
      level: number;
      income: number;
    }[];
  }>(`${this.baseUrl}/collect`, { headers });
}

  /**
   * Holt aktuelle Dorf-Daten
   */
  getVillage(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/village`, { headers });
  }

  /**
   * Upgradet das Dorf
   */
upgradeVillage(): Observable<{ success: boolean; newLevel: number }> {
  const headers = this.getAuthHeaders();
  return this.http.post<{ success: boolean; newLevel: number }>(
    `${this.baseUrl}/upgrade`,
    {},
    { headers }
  );
}

  /**
   * Baut Authorization-Header mit gespeichertem Token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }
}