import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { VillageService } from '../../services/village.service';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';

interface Villager {
  id: number;
  income: number;
}

@Component({
  standalone: true,
  selector: 'app-village',
  templateUrl: './village.component.html',
  styleUrls: ['./village.component.scss'],
  imports: [CommonModule, LoaderComponent, SidebarComponent],
})
export class VillageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('villageCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  money = 0;
  earned = 0;
  minutesPassed = 0;
  isLoading = true;

  villageLevel = 1;
  villagers: Villager[] = [];
  incomePerMinute = 0;

  animationId = 0;
  villagersPositions: { x: number; y: number; dx: number; dy: number }[] = [];

  ctx!: CanvasRenderingContext2D;

  constructor(
    private villageService: VillageService,
    private profileService: ProfileService,
    private auth: AuthService
  ) {}

  ngOnInit() {
    const username = this.auth.getUsername();
    if (!username) return;

    this.profileService.getUserStats(username).subscribe({
      next: (stats) => {
        this.money = stats.money;
      },
    });

    this.villageService.collectIncome().subscribe({
      next: (res) => {
        this.earned = res.earned;
        this.minutesPassed = res.minutesPassed;
        this.money += res.earned;

        this.villageLevel = res.villageLevel || 1;
        this.villagers = res.villagers || [];
        this.incomePerMinute = this.villagers.reduce((sum, v) => sum + v.income, 0);

        this.villagersPositions = Array.from({ length: this.villagers.length }, () => ({
          x: Math.random() * 380,
          y: Math.random() * 380,
          dx: (Math.random() - 0.5) * 2,
          dy: (Math.random() - 0.5) * 2,
        }));

        this.isLoading = false;
        this.startEarningLoop();
      },
      error: (err) => {
        console.error('❌ Fehler bei collectIncome:', err);
        this.isLoading = false;
      },
    });
  }

ngAfterViewInit() {
  const canvas = this.canvasRef.nativeElement;

  // Höhe berechnen
  const neededRows = Math.ceil(this.villageLevel / 3);
  const canvasHeight = Math.max(400, neededRows * 80 + 100);

  // 🎯 Wichtig: Beides setzen – intern + visuell
  canvas.height = canvasHeight;
  canvas.style.height = canvasHeight + 'px';

  this.ctx = canvas.getContext('2d')!;
  this.animate();
}

  updateCanvasHeight() {
    const canvas = this.canvasRef.nativeElement;
    const neededRows = Math.ceil(this.villageLevel / 3);
    const canvasHeight = Math.max(400, neededRows * 80 + 100);
    canvas.height = canvasHeight;
  }

  animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 🏠 Häuser zeichnen
    for (let i = 0; i < this.villageLevel; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 40 + col * 120;
      const y = 50 + row * 80;

      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(x, y, 60, 60);
    }

    // 👥 Bewohner animieren
    this.villagersPositions.forEach((v) => {
      v.x += v.dx;
      v.y += v.dy;

      if (v.x < 10 || v.x > 390) v.dx *= -1;
      if (v.y < 10 || v.y > canvas.height - 10) v.dy *= -1;

      this.ctx.beginPath();
      this.ctx.arc(v.x, v.y, 10, 0, Math.PI * 2);
      this.ctx.fillStyle = '#000000';
      this.ctx.fill();
    });
  };

  upgrade() {
    this.isLoading = true;

    this.villageService.upgradeVillage().subscribe({
      next: (res) => {
        this.villageLevel = res.newLevel;
        this.money -= 100 * (res.newLevel - 1);

        this.villageService.collectIncome().subscribe({
          next: (res) => {
            this.earned = res.earned;
            this.minutesPassed = res.minutesPassed;
            this.money += res.earned;

            this.villageLevel = res.villageLevel;
            this.villagers = res.villagers;
            this.incomePerMinute = this.villagers.reduce((sum, v) => sum + v.income, 0);

            this.villagersPositions = Array.from({ length: this.villagers.length }, () => ({
              x: Math.random() * 380,
              y: Math.random() * 380,
              dx: (Math.random() - 0.5) * 2,
              dy: (Math.random() - 0.5) * 2,
            }));

            this.updateCanvasHeight();
            this.isLoading = false;
          },
          error: () => (this.isLoading = false),
        });
      },
      error: () => (this.isLoading = false),
    });
  }

  startEarningLoop() {
    setInterval(() => {
      const perSecond = this.incomePerMinute / 60;
      this.money += perSecond;
    }, 1000);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
  }
}