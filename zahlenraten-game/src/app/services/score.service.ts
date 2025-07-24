import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface ScoreEntry {
  username: string;
  score: number;
  created_at?: string;
  consecutive_wins?: number;
  money_per_round?: number;
}


@Injectable({
  providedIn: 'root',
})
export class ScoreService {
  private apiUrl = 'https://outside-between.onrender.com/api/scores';

  constructor(private http: HttpClient) {}

  submitScore(scoreData: {
    username: string;
    score: number;
    consecutive_wins?: number;
    money_per_round?: number;
  }) {
    return this.http.post(`${this.apiUrl}/submit`, scoreData);
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


  isHighscore(score: number): Observable<{ isHighscore: boolean }> {
    return this.http.post<{ isHighscore: boolean }>(`${this.apiUrl}/isHighscore`, { score });
  }

  updateTotalScore(scoreData: { username: string; score: number }) {
    return this.http.post(`${this.apiUrl}/updateTotalScore`, scoreData);
  }

  getTotalScore(username: string): Observable<{ total_score: number }> {
  return this.http.get<{ total_score: number }>(`https://outside-between.onrender.com/api/scores/userTotalScore/${username}`);
}

}
