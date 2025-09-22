import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface ScoreEntry {
  username: string;
  score: number;
  created_at?: string;
  consecutive_wins?: number;
  money_per_round?: number;
  profileImageUrl?: string | null;
}

export interface SubmitScoreResponse {
  success: boolean;
  score: number; // final (server-multipliziert)
  money_per_round: number; // final (server-multipliziert)
  scoreMultiplier: number;
  monetaryMultiplier: number;
  savedAt: string;
}

@Injectable({ providedIn: 'root' })
export class ScoreService {
  private apiUrl = 'https://outside-between.onrender.com/api/scores';

  constructor(private http: HttpClient) {}

  /**
   * 📝 Score absenden – nur Basiswerte!
   * Der Server multipliziert mit den gespeicherten Multiplikatoren.
   */
  submitScore(body: {
    username: string;
    baseScore: number; // unmultipliziert
    baseMoneyPerRound: number; // unmultipliziert
    consecutive_wins: number;
  }): Observable<SubmitScoreResponse> {
    return this.http.post<SubmitScoreResponse>(`${this.apiUrl}/submit`, body);
  }

  getTopScores(): Observable<ScoreEntry[]> {
    return this.http.get<ScoreEntry[]>(`${this.apiUrl}/top`);
  }

  getTopStreaks(): Observable<ScoreEntry[]> {
    return this.http.get<ScoreEntry[]>(`${this.apiUrl}/topStreaks`);
  }

  getTopMoneyPerRound(): Observable<ScoreEntry[]> {
    return this.http.get<ScoreEntry[]>(`${this.apiUrl}/topMoneyPerRound`);
  }

  getUserScoreHistory(username: string): Observable<any[]> {
    return this.http.get<any[]>(`scores/user/${encodeURIComponent(username)}`);
  }

  isHighscore(score: number): Observable<{ isHighscore: boolean }> {
    return this.http.post<{ isHighscore: boolean }>(
      `${this.apiUrl}/isHighscore`,
      { score }
    );
  }

  updateTotalScore(data: {
    username: string;
    baseScore?: number;
    score?: number;
  }) {
    return this.http.post(`${this.apiUrl}/updateTotalScore`, data);
  }

  getTotalScore(username: string): Observable<{ total_score: number }> {
    return this.http.get<{ total_score: number }>(
      `${this.apiUrl}/userTotalScore/${encodeURIComponent(username)}`
    );
  }
}
