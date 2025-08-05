import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class VillageService {
  private apiUrl = '/api/collect';

  constructor(private http: HttpClient, private auth: AuthService) {}

  collectIncome() {
    const token = this.auth.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<{ earned: number; minutesPassed: number }>(this.apiUrl, { headers });
  }
}