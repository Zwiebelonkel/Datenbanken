import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';

export interface UserStats {
  totalScore: number;
  totalGames: number;
  unlockedAchievements: number;
  money: number;
  highscore: number;
  profileImageUrl?: string;
  level: number;
  xp: number;
  xpThreshold: number;
  xpPercent: number;
  skills: Skill[];
  skillPoints: number;
  scoreMultiplier: number;
  monetaryMultiplier: number;
}

export interface Skill {
  id: number;
  name: string;
  description: string;
  price: number;
  purchased: boolean;
  skill_level: number;
  max_level?: number;          // 👈 hinzugefügt (optional)
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private apiUrl = 'https://outside-between.onrender.com/api/profile';

  constructor(private http: HttpClient) {}

  uploadProfileImage(file: File, username: string): Observable<any> {
    const formData = new FormData();
    formData.append('profileImage', file, file.name);
    formData.append('username', username);

    return this.http.post<any>(`${this.apiUrl}/upload-profile-image`, formData, {
      headers: new HttpHeaders(),
      reportProgress: true,
      observe: 'events',
    });
  }

  addXp(
    username: string,
    xpToAdd: number
  ): Observable<{ message: string; leveledUp: boolean; level: number; xp: number; xpThreshold: number }> {
    return this.http.post<{ message: string; leveledUp: boolean; level: number; xp: number; xpThreshold: number }>(
      `${this.apiUrl}/${encodeURIComponent(username)}/add-xp`,
      { xpToAdd }
    );
  }

  getUserStats(username: string): Observable<UserStats> {
    return this.http.get<UserStats>(`${this.apiUrl}/${encodeURIComponent(username)}`);
  }

getUserSkills(username: string) {
  return this.http.get<Skill[]>(
    `https://outside-between.onrender.com/api/skills/${encodeURIComponent(username)}`
  );
}

upgradeSkill(username: string, skillName: string, _skillPrice: number, _skillLevel: number) {
  // Preis & Level kommen serverseitig aus dem Katalog; Client-Werte sind egal
  return this.http.post(
    `https://outside-between.onrender.com/api/skills/${encodeURIComponent(username)}/upgrade`,
    { skillName }
  );
}

}