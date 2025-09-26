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
import { Title, Meta } from '@angular/platform-browser';


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
  private allScoreTimes: number[] = []; // Stores combined, sorted, unique timestamps for the chart's x-axis

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
    private levelsService: LevelsService,
    private titleService: Title,
    private metaService: Meta
  ) {}

  setSeoTags(): void {
    this.titleService.setTitle('Entwicklung - CardCore');
  
    this.metaService.updateTag({ name: 'description', content: 'Verfolge deine Scoreentwicklung und vergleiche diese mit der anderer Spieler.' });
  
    this.metaService.updateTag({ property: 'og:title', content: 'Entwicklung - CardCore' });
  
    this.metaService.updateTag({ property: 'og:description', content: 'Verfolge deine Scoreentwicklung und vergleiche diese mit der anderer Spieler.' });
  
    this.metaService.updateTag({ name: 'keywords', content: 'Vergleich, CardCore, Graphen, History'});
  }

  ngOnInit(): void {
    this.setSeoTags()
    this.route.paramMap.subscribe((params) => {
      const user = params.get('username');
      if (!user) {
        this.error = 'Kein Benutzername angegeben';
        this.loading = false;
        return;
      }
      this.username = user;
      this.loadScoreHistory();
      this.loadOtherUsers();
    });

    window.addEventListener('resize', this.onResize);
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
  }

  /**
   * Efficiently interpolates scores onto a new set of timestamps.
   * If a point in `allTimes` is outside the range of `sourceTimes`, it will be `null`.
   */
  private interpolateScores(
    sourceTimes: number[],
    sourceScores: number[],
    allTimes: number[]
  ): (number | null)[] {
    if (sourceTimes.length === 0) {
      return allTimes.map(() => null);
    }

    const result: (number | null)[] = [];
    let sourceIndex = 0;

    for (const t of allTimes) {
      // Find the position of t relative to the sourceTimes
      while (sourceIndex < sourceTimes.length && sourceTimes[sourceIndex] < t) {
        sourceIndex++;
      }

      if (sourceIndex === 0) {
        // t is before the first source time
        result.push(sourceTimes[0] === t ? sourceScores[0] : null);
      } else if (sourceIndex >= sourceTimes.length) {
        // t is after the last source time
        const lastIndex = sourceTimes.length - 1;
        result.push(
          sourceTimes[lastIndex] === t ? sourceScores[lastIndex] : null
        );
      } else {
        const afterTime = sourceTimes[sourceIndex];
        const beforeTime = sourceTimes[sourceIndex - 1];

        if (afterTime === t) {
          // Exact match
          result.push(sourceScores[sourceIndex]);
        } else {
          // Interpolate between beforeTime and afterTime
          const afterScore = sourceScores[sourceIndex];
          const beforeScore = sourceScores[sourceIndex - 1];
          const factor = (t - beforeTime) / (afterTime - beforeTime);
          const interpolated =
            beforeScore + factor * (afterScore - beforeScore);
          result.push(interpolated);
        }
      }
    }
    return result;
  }

  private loadOtherUsers() {
    this.levelsService.load(1, 100).subscribe({
      next: (res) => {
        this.otherUsers = (res.users ?? [])
          .map((u) => u.username)
          .filter((u) => u !== this.username);
      },
      error: (err) => {
        console.error('Fehler beim Laden der Benutzerliste:', err);
      },
    });
  }

  private onResize = () => {
    this.lineChartOptions = this.buildChartOptions();
  };

  private loadScoreHistory() {
    this.loading = true;
    this.error = null;

    this.scoreService.getUserScoreHistory(this.username).subscribe({
      next: (data) => {
        this.mainUserData = {
          times: data.map((d) => new Date(d.created_at).getTime()),
          scores: data.map((d) => d.score),
        };

        this.secondUserData = null; // Reset for a clean comparison
        this.updateChart(); // Update with just the first user

        this.loading = false;

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
      this.secondUserData = null;
      this.updateChart();
      return;
    }

    this.scoreService.getUserScoreHistory(this.secondUsername).subscribe({
      next: (data) => {
        this.secondUserData = {
          times: data.map((d) => new Date(d.created_at).getTime()),
          scores: data.map((d) => d.score),
        };

        this.updateChart(); // Refresh with both datasets
      },
      error: (err) => {
        console.error(err);
        this.error = 'Fehler beim Laden des zweiten Benutzers.';
      },
    });
  }

  /** Compact tick formatting based on the time span */
  private formatTick(ts: number, span: number): string {
    const oneDay = 24 * 60 * 60 * 1000;
    if (span <= 2 * oneDay) {
      // < 2 days -> time only
      return new Date(ts).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (span <= 180 * oneDay) {
      // < 6 months -> day.month
      return new Date(ts).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
      });
    }
    // else -> month.year
    return new Date(ts).toLocaleDateString('de-DE', {
      month: '2-digit',
      year: '2-digit',
    });
  }

  /** Formats a timestamp for the tooltip title. */
  private formatTooltipTitle(ts: number): string {
    return new Date(ts).toLocaleString('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  private updateChart() {
    if (!this.mainUserData) return;

    // Combine, sort, and deduplicate all timestamps
    let allTimes = [...this.mainUserData.times];
    if (this.secondUserData) {
      allTimes.push(...this.secondUserData.times);
    }
    this.allScoreTimes = Array.from(new Set(allTimes)).sort((a, b) => a - b);

    // Interpolate scores for both users onto the common time axis
    const mainScores = this.interpolateScores(
      this.mainUserData.times,
      this.mainUserData.scores,
      this.allScoreTimes
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

    if (this.secondUserData && this.secondUsername) {
      const secondScores = this.interpolateScores(
        this.secondUserData.times,
        this.secondUserData.scores,
        this.allScoreTimes
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

    // Create formatted date labels from all timestamps
    const span =
      this.allScoreTimes.length > 1
        ? Math.max(...this.allScoreTimes) - Math.min(...this.allScoreTimes)
        : 0;
    this.lineChartLabels = this.allScoreTimes.map((t) =>
      this.formatTick(t, span)
    );
    this.thinOutLabels(6);

    this.lineChartOptions = this.buildChartOptions();
  }

  /** Visually thins out labels, but keeps all data points. */
  private thinOutLabels(maxVisible: number) {
    const n = this.lineChartLabels.length;
    if (n <= maxVisible) return;
    const step = Math.ceil(n / maxVisible);
    this.lineChartLabels = this.lineChartLabels.map((l, i) =>
      i % step === 0 ? l : ''
    );
  }

  /** Build chart options based on viewport width. */
  private buildChartOptions(): ChartOptions<'line'> {
    const w = window.innerWidth || 1024;
    const maxTicks = w < 380 ? 4 : w < 640 ? 5 : 8;

    return {
      responsive: true,
      maintainAspectRatio: false, // Let CSS height from SCSS apply
      interaction: { mode: 'nearest', intersect: false },
      layout: { padding: { top: 8, right: 4, bottom: 0, left: 0 } },
      elements: {
        point: { radius: 2 },
        line: { borderWidth: 2, spanGaps: true }, // spanGaps will connect lines over `null` data points
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
            precision: 0, // Integers, if score is an integer
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
            // Compact tooltip with full date+time from original timestamp
            title: (items) => {
              const idx = items?.[0]?.dataIndex;
              if (idx !== undefined && this.allScoreTimes[idx]) {
                return this.formatTooltipTitle(this.allScoreTimes[idx]);
              }
              return '';
            },
          },
        },
        decimation: {
          enabled: true,
          algorithm: 'lttb',
          samples: 60, // Throttles for very large datasets
        },
      },
    };
  }
}
