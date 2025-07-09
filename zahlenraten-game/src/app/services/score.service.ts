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
  private apiUrl = 'http://localhost:3000/api/scores';

  constructor(private http: HttpClient) {}

  submitScore(scoreData: { username: string; score: number }) {
    return this.http.post(`${this.apiUrl}/submit`, scoreData);
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
}
