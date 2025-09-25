import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChartsModule } from 'ng2-charts';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js';
import { ScoreService } from '../../services/score.service';
import { LevelsService } from '../../services/levels.service';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { Title, Meta } from '@angular/platform-browser';


@Component({
  selector: 'app-compare-scores',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgChartsModule,
    LoaderComponent,
    SidebarComponent,
    TopbarComponent,
  ],
  templateUrl: './compare-scores.component.html',
  styleUrls: ['./compare-scores.component.scss'],
})
export class CompareScoresComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;

  firstUsername: string | null = null;
  secondUsername: string | null = null;

  allUsers: string[] = [];
  availableForSecondSelection: string[] = [];

  private firstUserData: { times: number[]; scores: number[] } | null = null;
  private secondUserData: { times: number[]; scores: number[] } | null = null;
  private allScoreTimes: number[] = [];

  lineChartData: ChartDataset<'line'>[] = [];
  lineChartLabels: string[] = [];
  lineChartOptions: ChartOptions<'line'> = this.buildChartOptions();
  lineChartType: 'line' = 'line';

  constructor(
    private scoreService: ScoreService,
    private levelsService: LevelsService,
    private titleService: Title,
    private metaService: Meta
  ) {    this.titleService.setTitle('Spieler-Vergleich - CardCore');
    this.metaService.addTags([
      { name: 'description', content: 'Vergleiche deine Punktzahlen mit anderen Spielern und sieh, wer die Nase vorn hat.' },
      { property: 'og:title', content: 'Spieler-Vergleich - CardCore' },
      { property: 'og:description', content: 'Vergleiche deine Punktzahlen mit anderen Spielern und sieh, wer die Nase vorn hat.' },
      { property: 'og:image', content: 'https://zahlenraten.jascha.ai/assets/logo.png' }
    ]);}

  ngOnInit(): void {
    this.loadAllUsers();
    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
  }

  private loadAllUsers() {
    this.loading = true;
    this.levelsService.load(1, 200).subscribe({
      next: (res) => {
        this.allUsers = (res.users ?? []).map((u) => u.username);
        if (this.allUsers.length >= 2) {
          this.firstUsername = this.allUsers[0];
          this.secondUsername = this.allUsers[1];
          this.updateAvailableUsers();
          this.loadDataForBothUsers();
        } else {
          this.error = 'Nicht genügend Benutzer zum Vergleichen vorhanden.';
          this.loading = false;
        }
      },
      error: (err) => {
        this.error = 'Fehler beim Laden der Benutzerliste.';
        this.loading = false;
        console.error(err);
      },
    });
  }

  onUser1Change(): void {
    if (this.firstUsername === this.secondUsername) {
      this.secondUsername = this.availableForSecondSelection[0] || null;
    }
    this.updateAvailableUsers();
    this.loadDataForBothUsers();
  }

  onUser2Change(): void {
    this.loadDataForBothUsers();
  }

  private loadDataForBothUsers() {
    if (!this.firstUsername || !this.secondUsername) return;

    this.loading = true;
    // Using forkJoin could be an option here if you import it
    this.scoreService.getUserScoreHistory(this.firstUsername).subscribe({
      next: (data1) => {
        this.firstUserData = {
          times: data1.map((d) => new Date(d.created_at).getTime()),
          scores: data1.map((d) => d.score),
        };
        if (this.secondUsername) {
          this.scoreService.getUserScoreHistory(this.secondUsername).subscribe({
            next: (data2) => {
              this.secondUserData = {
                times: data2.map((d) => new Date(d.created_at).getTime()),
                scores: data2.map((d) => d.score),
              };
              this.updateChart();
            },
            error: (err) => this.handleError(err, this.secondUsername),
          });
        }
      },
      error: (err) => this.handleError(err, this.firstUsername),
    });
  }

  private handleError(err: any, username: string | null) {
    this.error = `Fehler beim Laden der Daten für ${username}.`;
    this.loading = false;
    console.error(err);
  }

  private updateAvailableUsers(): void {
    this.availableForSecondSelection = this.allUsers.filter(
      (u) => u !== this.firstUsername
    );
  }

  private updateChart() {
    if (!this.firstUserData || !this.secondUserData) return;

    let allTimes: number[] = [...this.firstUserData.times, ...this.secondUserData.times];
    this.allScoreTimes = Array.from(new Set(allTimes)).sort((a, b) => a - b);

    const firstScores = this.interpolateScores(this.firstUserData.times, this.firstUserData.scores, this.allScoreTimes);
    const secondScores = this.interpolateScores(this.secondUserData.times, this.secondUserData.scores, this.allScoreTimes);

    this.lineChartData = [
      {
        data: firstScores,
        label: `Score von ${this.firstUsername}`,
        fill: false, tension: 0.25, borderColor: '#42f5a1ff', backgroundColor: 'rgba(26, 245, 161, 0.15)',
        pointRadius: 2, pointHoverRadius: 3, pointHitRadius: 6,
      },
      {
        data: secondScores,
        label: `Score von ${this.secondUsername}`,
        fill: false, tension: 0.25, borderColor: '#4287f5ff', backgroundColor: 'rgba(66, 135, 245, 0.15)',
        pointRadius: 2, pointHoverRadius: 3, pointHitRadius: 6,
      },
    ];

    const span = this.allScoreTimes.length > 1 ? Math.max(...this.allScoreTimes) - Math.min(...this.allScoreTimes) : 0;
    this.lineChartLabels = this.allScoreTimes.map((t) => this.formatTick(t, span));
    this.thinOutLabels(8);
    
    this.lineChartOptions = this.buildChartOptions();
    this.loading = false;
  }

  private interpolateScores(sourceTimes: number[], sourceScores: number[], allTimes: number[]): (number | null)[] {
    if (sourceTimes.length === 0) return allTimes.map(() => null);
    const result: (number | null)[] = [];
    let sourceIndex = 0;
    for (const t of allTimes) {
      while (sourceIndex < sourceTimes.length && sourceTimes[sourceIndex] < t) {
        sourceIndex++;
      }
      if (sourceIndex === 0) {
        result.push(sourceTimes[0] === t ? sourceScores[0] : null);
      } else if (sourceIndex >= sourceTimes.length) {
        const lastIndex = sourceTimes.length - 1;
        result.push(sourceTimes[lastIndex] === t ? sourceScores[lastIndex] : null);
      } else {
        const afterTime = sourceTimes[sourceIndex];
        const beforeTime = sourceTimes[sourceIndex - 1];
        if (afterTime === t) {
          result.push(sourceScores[sourceIndex]);
        } else {
          const afterScore = sourceScores[sourceIndex];
          const beforeScore = sourceScores[sourceIndex - 1];
          const factor = (t - beforeTime) / (afterTime - beforeTime);
          result.push(beforeScore + factor * (afterScore - beforeScore));
        }
      }
    }
    return result;
  }

  private formatTick(ts: number, span: number): string {
    const oneDay = 24 * 60 * 60 * 1000;
    if (span <= 2 * oneDay) return new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    if (span <= 180 * oneDay) return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    return new Date(ts).toLocaleDateString('de-DE', { month: '2-digit', year: '2-digit' });
  }

  private formatTooltipTitle(ts: number): string {
    return new Date(ts).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  private thinOutLabels(maxVisible: number) {
    const n = this.lineChartLabels.length;
    if (n <= maxVisible) return;
    const step = Math.ceil(n / maxVisible);
    this.lineChartLabels = this.lineChartLabels.map((l, i) => i % step === 0 ? l : '');
  }

  private onResize = () => {
    this.lineChartOptions = this.buildChartOptions();
  };

  private buildChartOptions(): ChartOptions<'line'> {
    const w = window.innerWidth || 1024;
    const maxTicks = w < 380 ? 4 : w < 640 ? 5 : 8;
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      layout: { padding: { top: 8, right: 4, bottom: 0, left: 0 } },
      elements: { point: { radius: 2 }, line: { borderWidth: 2, spanGaps: true } },
      scales: {
        x: { ticks: { autoSkip: true, maxTicksLimit: maxTicks, maxRotation: 0, minRotation: 0, padding: 6 }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0, padding: 6, maxTicksLimit: 6 }, grid: { color: 'rgba(0,0,0,0.06)' } },
      },
      plugins: {
        legend: { display: true, position: 'bottom', labels: { usePointStyle: true, boxWidth: 8, boxHeight: 8 } },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items?.[0]?.dataIndex;
              if (idx !== undefined && this.allScoreTimes[idx]) {
                return this.formatTooltipTitle(this.allScoreTimes[idx]);
              }
              return '';
            },
          },
        },
        decimation: { enabled: true, algorithm: 'lttb', samples: 60 },
      },
    };
  }
}
