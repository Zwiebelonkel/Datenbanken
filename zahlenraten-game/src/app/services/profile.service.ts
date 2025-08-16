import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  skills: Skill[];      // neu: Array von Skills des Benutzers
}

export interface Skill {
  id: number;
  name: string;
  description: string;
  price: number;
  purchased: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private apiUrl = 'https://outside-between.onrender.com/api/profile';

  constructor(private http: HttpClient) {}

  // 📤 Profilbild hochladen
  uploadProfileImage(
    file: File,
    username: string
  ): Observable<any> {  // Beobachtungs-Typ sollte HttpEvent sein
    const formData = new FormData();
    formData.append('profileImage', file, file.name);
    formData.append('username', username);

    return this.http.post<any>(`${this.apiUrl}/upload-profile-image`, formData, {
      headers: new HttpHeaders(),
      reportProgress: true,
      observe: 'events',
    });
  }

  // ➕ XP hinzufügen
  addXp(username: string, xpToAdd: number): Observable<{ message: string; leveledUp: boolean; level: number; xp: number; xpThreshold: number }> {
    return this.http.post<{ message: string; leveledUp: boolean; level: number; xp: number; xpThreshold: number }>(
      `${this.apiUrl}/${username}/add-xp`,
      { xpToAdd }
    );
  }

  // 📥 Skills des Benutzers abrufen
  getUserSkills(username: string): Observable<Skill[]> {
    return this.http.get<Skill[]>(`${this.apiUrl}/skills/${username}`);
  }

  // 📤 Skill upgraden
  upgradeSkill(username: string, skillName: string, skillPrice: number, skillLevel: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${username}/skills/upgrade`, { skillName, skillPrice, skillLevel });
  }

  // 📥 Benutzerstatistiken laden (z. B. Skill-Punkte)
  getUserStats(username: string): Observable<Player> {
    return this.http.get<Player>(`${this.apiUrl}/${username}`);
  }
}
