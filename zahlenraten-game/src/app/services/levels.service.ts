import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, shareReplay } from 'rxjs';

export interface LevelUser {
  username: string;
  level: number;
  xp: number;
  xpThreshold: number;
  xpPercent: number;
  profileImageUrl?: string | null;
  total_score?: number;
}

@Injectable({ providedIn: 'root' })
export class LevelsService {
  private cache$?: Observable<LevelUser[]>;

  constructor(private http: HttpClient) {}

  /** Lädt die Liste einmal und cached sie bis zum nächsten echten Seiten-Reload */
  load(): Observable<LevelUser[]> {
    if (!this.cache$) {
      this.cache$ = this.http
        .get<{ users: LevelUser[] }>('https://outside-between.onrender.com/api/users/levels')
        .pipe(
          map(res => res.users ?? []),
          shareReplay(1) // ⬅️ Memory-Cache bis App-Neustart / Reload
        );
    }
    return this.cache$;
  }

  /** Falls du manuell aktualisieren willst (Button o.ä.) */
  refresh(): void {
    this.cache$ = undefined;
  }
}