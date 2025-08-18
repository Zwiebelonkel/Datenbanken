import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ConsentPrefs = {
  necessary: boolean; // <-- vorher: true
  ads: boolean;
  analytics: boolean;
};
const STORAGE_KEY = 'consent_prefs_v1';

@Injectable({ providedIn: 'root' })
export class ConsentService {
  /** steuert, ob der Dialog sichtbar ist */
  readonly modalOpen$ = new BehaviorSubject<boolean>(false);

  /** aktuelle Präferenzen */
  readonly prefs$ = new BehaviorSubject<ConsentPrefs>({
    necessary: true,
    ads: false,
    analytics: false,
  });

  constructor() {
    this.loadFromStorage();
  }

  open() {
    this.modalOpen$.next(true);
  }
  close() {
    this.modalOpen$.next(false);
  }

  acceptAll() {
    this.setPrefs({ necessary: true, ads: true, analytics: true });
    this.close();
  }

  rejectNonEssential() {
    this.setPrefs({ necessary: true, ads: false, analytics: false });
    this.close();
  }

  save(partial: Partial<ConsentPrefs>) {
    const next = { ...this.prefs$.value, ...partial, necessary: true };
    this.setPrefs(next);
    this.close();
  }

  get canShowAds() {
    return this.prefs$.value.ads;
  }
  get allowAnalytics() {
    return this.prefs$.value.analytics;
  }

  private setPrefs(p: ConsentPrefs) {
    this.prefs$.next(p);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    // 🔔 App-weit bekanntgeben (falls du Listener hast)
    window.dispatchEvent(new CustomEvent('consent-changed', { detail: p }));
  }

  private loadFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ConsentPrefs;
        this.prefs$.next({
          necessary: true,
          ads: !!parsed.ads,
          analytics: !!parsed.analytics,
        });
        return;
      } catch {}
    }
    // Wenn nichts gespeichert: beim ersten Besuch Dialog öffnen
    this.open();
  }
}
