import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UserStats {
  totalScore: number;
  totalGames: number;
  unlockedAchievements: number;
  money: number;
  highscore: number;
  profileImageUrl?: string;
  level: number;
  xp: number;
  xpThreshold: number;  // neu
  xpPercent: number;    // neu
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private apiUrl = 'https://outside-between.onrender.com/api/profile';

  constructor(private http: HttpClient) {}

  // 📥 User-Statistiken laden
  getUserStats(username: string): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}?username=${username}`);
  }

  // 📤 Profilbild hochladen
  uploadProfileImage(
    file: File,
    username: string
  ): Observable<any> {  // Beobachtungs-Typ sollte HttpEvent sein
    const formData = new FormData();
    formData.append('profileImage', file, file.name);
    formData.append('username', username);

    // Anfrage mit reportProgress und observe: 'events'
    return this.http.post<any>(`${this.apiUrl}/upload-profile-image`, formData, {
      headers: new HttpHeaders(),
      reportProgress: true,
      observe: 'events',  // Wird notwendig, um alle Events zu beobachten
    });
  }

  // ➕ XP hinzufügen
  addXp(username: string, xpToAdd: number): Observable<{ message: string; leveledUp: boolean; level: number; xp: number; xpThreshold: number }> {
    return this.http.post<{ message: string; leveledUp: boolean; level: number; xp: number; xpThreshold: number }>(
      `${this.apiUrl}/${username}/add-xp`,
      { xpToAdd }
    );
  }
}
