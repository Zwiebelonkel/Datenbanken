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
    return this.http.get<Skill[]>(`${this.apiUrl}/${username}/skills`);
  }

  // 📤 Skill kaufen
  purchaseSkill(username: string, skillId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${username}/skills/purchase`, { skillId });
  }

  // 📥 Aktuelle Skill-Punkte des Benutzers abrufen
  getSkillPoints(username: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/${username}/skill-points`);
  }
}
