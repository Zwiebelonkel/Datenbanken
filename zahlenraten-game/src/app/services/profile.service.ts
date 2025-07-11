import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface UserStats {
  totalScore: number;
  totalGames: number;
  unlockedAchievements: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private apiUrl = '//outside-between.onrender.com/api/profile';

  constructor(private http: HttpClient) {}

  getUserStats(username: string): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}?username=${username}`);
  }
}
