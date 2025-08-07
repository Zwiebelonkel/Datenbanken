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
    speed: number;
    stamina: number;
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
      speed: number;
      stamina: number;
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
upgradeVillage(): Observable<{ success?: boolean; newLevel: number; newMoney: number; newSpeed: number; newStamina: number; }> {
  const headers = this.getAuthHeaders();
  return this.http.post<{ success?: boolean; newLevel: number; newMoney: number; newSpeed: number; newStamina: number; }>(
    `${this.baseUrl}/upgrade`,
    {},
    { headers }
  );
}

upgradeVillager(id: number): Observable<{ newLevel: number; newIncome: number; newMoney: number }> {
  const headers = this.getAuthHeaders();
  return this.http.post<{ newLevel: number; newIncome: number; newMoney: number }>(
    `${this.baseUrl}/upgrade-villager`,
    { villagerId: id },
    { headers }
  );
}

  
upgradeSpeed(id: number): Observable<{ newSpeed: number; newMoney: number }> {
  const headers = this.getAuthHeaders();
  return this.http.post<{ newSpeed: number; newMoney: number }>(
    `${this.baseUrl}/upgrade-speed`,
    { villagerId: id },
    { headers }
  );
}

  upgradeStamina(id: number): Observable<{ newStamina: number; newMoney: number }> {
  const headers = this.getAuthHeaders();
  return this.http.post<{ newStamina: number; newMoney: number }>(
    `${this.baseUrl}/upgrade-stamina`,
    { villagerId: id },
    { headers }
  );
}

renameVillager(id: number, name: string) {
  const headers = this.getAuthHeaders(); // Falls Auth nötig ist
  return this.http.patch<{ newName: string }>(
    `${this.baseUrl}/villager/${id}/rename`,
    { name },
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
