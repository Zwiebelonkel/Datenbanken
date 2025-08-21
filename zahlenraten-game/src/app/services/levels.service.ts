import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';

export interface LevelUser {
  username: string;
  level: number;
  xp: number;
  xpThreshold: number;
  xpPercent: number;
  profileImageUrl?: string | null;
  total_score?: number;
}

export interface LevelsResponse {
  users: LevelUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

@Injectable({ providedIn: 'root' })
export class LevelsService {
  private readonly baseUrl = 'https://outside-between.onrender.com/api/users/levels';

  // Cache pro (page,limit)
  private cache = new Map<string, Observable<LevelsResponse>>();

  constructor(private http: HttpClient) {}

  /** Lädt Seite `page` (Default 1) mit `limit` (Default 10) und cached das Ergebnis. */
  load(page = 1, limit = 10, force = false): Observable<LevelsResponse> {
    const key = this.key(page, limit);
    if (!force && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const params = new HttpParams().set('page', page).set('limit', limit);
    const req$ = this.http
      .get<LevelsResponse>(this.baseUrl, { params })
      .pipe(shareReplay(1)); // Memory-Cache bis App-Reload

    this.cache.set(key, req$);
    return req$;
  }

  /** Prefetch der nächsten Seite – nützlich nach erfolgreichem Laden von Seite N. */
  prefetchNext(currentPage: number, limit = 10, totalPages?: number) {
    const next = currentPage + 1;
    if (totalPages && next > totalPages) return;
    const key = this.key(next, limit);
    if (!this.cache.has(key)) {
      this.load(next, limit).subscribe({ next: () => {}, error: () => {} });
    }
  }

  /** Einzelne Seite aus dem Cache entfernen oder alles leeren. */
  refresh(page?: number, limit = 10): void {
    if (page === undefined) {
      this.cache.clear();
    } else {
      this.cache.delete(this.key(page, limit));
    }
  }

  /** Prüfen, ob eine Seite bereits im Cache liegt. */
  hasCached(page = 1, limit = 10): boolean {
    return this.cache.has(this.key(page, limit));
  }

  private key(page: number, limit: number) {
    return `${page}:${limit}`;
  }
}