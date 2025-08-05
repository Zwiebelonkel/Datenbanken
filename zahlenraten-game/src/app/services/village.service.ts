import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class VillageService {
  private apiUrl = '/api/collect';

  constructor(private http: HttpClient) {}

  collectIncome() {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    return this.http.get<{ earned: number; minutesPassed: number }>(
      this.apiUrl,
      { headers }
    );
  }
}
