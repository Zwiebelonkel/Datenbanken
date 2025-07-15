import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface ScoreEntry {
  username: string;
  score: number;
  created_at?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ScoreService {
  private apiUrl = 'https://outside-between.onrender.com/api/scores';

  constructor(private http: HttpClient) {}

  submitScore(username: string, score: number) {
  return this.http.post('/api/submit', { username, score});
  }

  getTopScores(): Observable<ScoreEntry[]> {
    return this.http.get<ScoreEntry[]>(`${this.apiUrl}/top`);
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
