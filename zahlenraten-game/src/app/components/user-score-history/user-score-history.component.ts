import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js';
import { ScoreService } from '../../services/score.service';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-user-score-history',
  standalone: true,
  imports: [
    CommonModule,
    NgChartsModule,
    LoaderComponent,
    SidebarComponent,
    TopbarComponent,
  ],
  templateUrl: './user-score-history.component.html',
  styleUrls: ['./user-score-history.component.scss'],
})
export class UserScoreHistoryComponent implements OnInit {
  username = '';
  loading = true;
  error: string | null = null;

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
    private route: ActivatedRoute
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
    });

    // Bei Resize die Tick-Dichte neu setzen
    window.addEventListener('resize', this.onResize);
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
        const times = data.map((d) => new Date(d.created_at).getTime());
        const scores = data.map((d) => d.score);

        // Spannweite ermitteln und Labels kompakt formatieren
        const span = (Math.max(...times) || 0) - (Math.min(...times) || 0);
        this.lineChartLabels = times.map((t) => this.formatTick(t, span));

        // Optional: weniger sichtbare Labels (Auto-Skip unabhängig)
        this.thinOutLabels(6); // max ~6 lesbare Labels

        this.lineChartData[0].data = scores;

        // Optionen an Viewport anpassen
        this.lineChartOptions = this.buildChartOptions();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Fehler beim Laden der Score-Daten.';
        this.loading = false;
        console.error(err);
      },
    });
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
      elements: { point: { radius: 2 }, line: { borderWidth: 2 } },
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
