import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js';
import { ScoreService } from '../../services/score.service';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { TutorialComponent } from '../tutorial/tutorial.component';
import { FormsModule } from '@angular/forms';
import { LevelsService, LevelUser } from '../../services/levels.service';

@Component({
  selector: 'app-user-score-history',
  standalone: true,
  imports: [
    CommonModule,
    NgChartsModule,
    LoaderComponent,
    SidebarComponent,
    TopbarComponent,
    TutorialComponent,
    FormsModule,
  ],
  templateUrl: './user-score-history.component.html',
  styleUrls: ['./user-score-history.component.scss'],
})
export class UserScoreHistoryComponent implements OnInit {
  username = '';
  loading = true;
  error: string | null = null;

  otherUsers: string[] = [];

  private mainUserData: { times: number[]; scores: number[] } = {
    times: [],
    scores: [],
  };
  private secondUserData: { times: number[]; scores: number[] } | null = null;

  secondUsername: string | null = null;
  private allScoreTimes: number[] = []; // für kombinierte Labels

  tutorialTitle = 'Wie funktioniert das?';
  tutorialDescription =
    'Hier siehst du den Verlauf deiner erzielten Scores in den vergangenen Spielen. So kannst du deine Fortschritte und Verbesserungen im Spiel verfolgen und dir Statistiken zu deinen Leistungen ansehen.';

  lineChartData: ChartDataset<'line'>[] = [
    {
      data: [],
      label: 'Scoreverlauf',
      fill: false,
      tension: 0.25,
      borderColor: '#42f5a1ff',
      backgroundColor: 'rgba(26, 245, 161, 0.15)',
      pointRadius: 2,
      pointHoverRadius: 3,
      pointHitRadius: 6,
    },
  ];
  lineChartLabels: string[] = [];

  lineChartOptions: ChartOptions<'line'> = this.buildChartOptions();
  lineChartType: 'line' = 'line';

  constructor(
    private scoreService: ScoreService,
    private route: ActivatedRoute,
    private levelsService: LevelsService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const user = params.get('username');
      if (!user) {
        this.error = 'Kein Benutzername angegeben';
        this.loading = false;
        return;
      }
      this.username = user;
      this.loadScoreHistory();
      this.loadOtherUsers(); // 🔄
    });

    window.addEventListener('resize', this.onResize);
  }

  private interpolateScores(
    times: number[],
    scores: number[],
    allTimes: number[]
  ): number[] {
    const result: number[] = [];
    for (const t of allTimes) {
      const exactIndex = times.indexOf(t);
      if (exactIndex !== -1) {
        // exakter Wert vorhanden
        result.push(scores[exactIndex]);
      } else {
        // Interpolieren: Finde Zeitpunkte davor und danach
        const beforeIndex = times.filter((time) => time < t).pop();
        const afterIndex = times.find((time) => time > t);

        if (beforeIndex !== undefined && afterIndex !== undefined) {
          const beforeScore = scores[times.indexOf(beforeIndex)];
          const afterScore = scores[times.indexOf(afterIndex)];
          // Lineare Interpolation
          const factor = (t - beforeIndex) / (afterIndex - beforeIndex);
          const interpolated =
            beforeScore + factor * (afterScore - beforeScore);
          result.push(interpolated);
        } else {
          // Kein Interpolationspunkt möglich, setze null oder 0
          result.push(0);
        }
      }
    }
    return result;
  }

  private loadOtherUsers() {
    // Lade alle Benutzer auf einmal – z. B. die ersten 100
    this.levelsService.load(1, 100).subscribe({
      next: (res) => {
        this.otherUsers = (res.users ?? [])
          .map((u) => u.username)
          .filter((u) => u !== this.username); // aktiven Benutzer ausschließen
      },
      error: (err) => {
        console.error('Fehler beim Laden der Benutzerliste:', err);
      },
    });
  }

  private onResize = () => {
    this.lineChartOptions = this.buildChartOptions();
  };

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
  }

  private loadScoreHistory() {
    this.loading = true;
    this.error = null;

    this.scoreService.getUserScoreHistory(this.username).subscribe({
      next: (data) => {
        this.mainUserData = {
          times: data.map((d) => new Date(d.created_at).getTime()),
          scores: data.map((d) => d.score),
        };

        this.secondUserData = null; // Zurücksetzen für sauberen Vergleich
        this.updateChart(); // Nur erster Nutzer

        this.loading = false;

        // Falls zweiter Nutzer schon ausgewählt ist → direkt laden
        if (this.secondUsername) {
          this.loadSecondUser();
        }
      },
      error: (err) => {
        this.error = 'Fehler beim Laden der Score-Daten.';
        this.loading = false;
        console.error(err);
      },
    });
  }

  loadSecondUser() {
    if (!this.secondUsername) {
      this.secondUserData = null; // Entfernt Vergleich
      this.updateChart();
      return;
    }

    this.scoreService.getUserScoreHistory(this.secondUsername).subscribe({
      next: (data) => {
        this.secondUserData = {
          times: data.map((d) => new Date(d.created_at).getTime()),
          scores: data.map((d) => d.score),
        };

        this.updateChart(); // aktualisiert beide Datenreihen
      },
      error: (err) => {
        console.error(err);
        this.error = 'Fehler beim Laden des zweiten Benutzers.';
      },
    });
  }

  private updateLabelsAndOptions() {
    if (this.allScoreTimes.length === 0) return;

    const span =
      (Math.max(...this.allScoreTimes) || 0) -
      (Math.min(...this.allScoreTimes) || 0);

    this.lineChartLabels = this.allScoreTimes.map((t) =>
      this.formatTick(t, span)
    );

    this.thinOutLabels(6);
    this.lineChartOptions = this.buildChartOptions();
  }

  /** Kompakte Tick-Formatierung je nach Zeitspannweite */
  private formatTick(ts: number, span: number): string {
    const oneDay = 24 * 60 * 60 * 1000;
    if (span <= 2 * oneDay) {
      // < 2 Tage → nur Uhrzeit
      return new Date(ts).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (span <= 180 * oneDay) {
      // < 6 Monate → Tag.Monat
      return new Date(ts).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
      });
    }
    // sonst Monat.Jahr
    return new Date(ts).toLocaleDateString('de-DE', {
      month: '2-digit',
      year: '2-digit',
    });
  }

  private updateChart() {
    if (!this.mainUserData) return;

    // Alle Zeitpunkte zusammenführen und sortieren + deduplizieren
    let allTimes = [...this.mainUserData.times];
    if (this.secondUserData) {
      allTimes = [...allTimes, ...this.secondUserData.times];
    }
    allTimes = Array.from(new Set(allTimes)).sort((a, b) => a - b);

    // Hilfsfunktion: Score für Zeit t finden oder null
    const mapScores = (
      times: number[],
      scores: number[],
      allTimes: number[]
    ) => {
      return allTimes.map((t) => {
        const index = times.indexOf(t);
        return index !== -1 ? scores[index] : null;
      });
    };

    // Scores der Nutzer auf gemeinsame Zeitachse abbilden
    const mainScores = this.interpolateScores(
      this.mainUserData.times,
      this.mainUserData.scores,
      allTimes
    );

    const datasets: ChartDataset<'line'>[] = [
      {
        data: mainScores,
        label: `Score von ${this.username}`,
        fill: false,
        tension: 0.25,
        borderColor: '#42f5a1ff',
        backgroundColor: 'rgba(26, 245, 161, 0.15)',
        pointRadius: 2,
        pointHoverRadius: 3,
        pointHitRadius: 6,
      },
    ];

    if (this.secondUserData) {
      const secondScores = mapScores(
        this.secondUserData.times,
        this.secondUserData.scores,
        allTimes
      );
      datasets.push({
        data: secondScores,
        label: `Score von ${this.secondUsername}`,
        fill: false,
        tension: 0.25,
        borderColor: '#4287f5ff',
        backgroundColor: 'rgba(66, 135, 245, 0.15)',
        pointRadius: 2,
        pointHoverRadius: 3,
        pointHitRadius: 6,
      });
    }

    this.lineChartData = datasets;

    // Labels als formatiertes Datum zu allTimes
    const span = Math.max(...allTimes) - Math.min(...allTimes);
    this.lineChartLabels = allTimes.map((t) => this.formatTick(t, span));
    this.thinOutLabels(6);

    this.lineChartOptions = this.buildChartOptions();
  }

  /** Dünnt sichtbare Labels aus (visuell, Daten bleiben komplett) */
  private thinOutLabels(maxVisible: number) {
    const n = this.lineChartLabels.length;
    if (n <= maxVisible) return;
    const step = Math.ceil(n / maxVisible);
    this.lineChartLabels = this.lineChartLabels.map((l, i) =>
      i % step === 0 ? l : ''
    );
  }

  /** Optionen abhängig von der Viewport-Breite */
  private buildChartOptions(): ChartOptions<'line'> {
    const w = window.innerWidth || 1024;
    // Weniger Ticks auf kleineren Screens
    const maxTicks = w < 380 ? 4 : w < 640 ? 5 : 8;

    return {
      responsive: true,
      maintainAspectRatio: false, // CSS-Höhe aus SCSS soll gelten
      interaction: { mode: 'nearest', intersect: false },
      layout: { padding: { top: 8, right: 4, bottom: 0, left: 0 } },
      elements: {
        point: { radius: 2 },
        line: { borderWidth: 2, spanGaps: true },
      },
      scales: {
        x: {
          ticks: {
            autoSkip: true,
            maxTicksLimit: maxTicks,
            maxRotation: 0,
            minRotation: 0,
            padding: 6,
          },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0, // Ganzzahlen, falls Score ganzzahlig
            padding: 6,
            maxTicksLimit: 6,
          },
          grid: { color: 'rgba(0,0,0,0.06)' },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 },
        },
        tooltip: {
          callbacks: {
            // kompakter Tooltip mit vollem Datum+Zeit
            title: (items) => {
              const idx = items?.[0]?.dataIndex ?? 0;
              return this.lineChartLabels[idx] || '';
            },
          },
        },
        decimation: {
          enabled: true,
          algorithm: 'lttb',
          samples: 60, // drosselt für sehr viele Punkte
        },
      },
    };
  }
}
