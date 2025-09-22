import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartOptions, ChartType, ChartDataset } from 'chart.js';
import { ScoreService } from '../../services/score.service';

@Component({
  selector: 'app-user-score-history',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './user-score-history.component.html',
})
export class UserScoreHistoryComponent implements OnInit {
  username: string = '';
  loading = true;
  error: string | null = null;

  lineChartData: ChartDataset[] = [
    {
      data: [],
      label: 'Scoreverlauf',
      fill: false,
      tension: 0.3,
      borderColor: '#42A5F5',
      backgroundColor: 'rgba(66,165,245,0.2)',
    },
  ];

  lineChartLabels: string[] = [];

  lineChartOptions: ChartOptions = {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: true,
      },
    },
  };

  lineChartType: ChartType = 'line';

  constructor(
    private scoreService: ScoreService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // username aus der Route auslesen
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
  }

  private loadScoreHistory() {
    this.loading = true;
    this.error = null;

    this.scoreService.getUserScoreHistory(this.username).subscribe({
      next: (data) => {
        this.lineChartLabels = data.map((d) =>
          new Date(d.created_at).toLocaleString('de-DE')
        );
        this.lineChartData[0].data = data.map((d) => d.score);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Fehler beim Laden der Score-Daten.';
        this.loading = false;
        console.error(err);
      },
    });
  }
}
