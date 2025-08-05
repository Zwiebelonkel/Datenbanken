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
  imports: [CommonModule, LoaderComponent],
})
export class VillageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('villageCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  money = 0;
  earned = 0;
  minutesPassed = 0;
  isLoading = true;

  villageLevel = 1;
  villagers: Villager[] = [];

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

    // 💰 Aktuelles Geld laden
    this.profileService.getUserStats(username).subscribe({
      next: (stats) => {
        this.money = stats.money;
      },
    });

    // 📈 Einkommen + Dorf laden
    this.villageService.collectIncome().subscribe({
      next: (res) => {
        this.earned = res.earned;
        this.minutesPassed = res.minutesPassed;
        this.money += res.earned;

        this.villageLevel = res.villageLevel || 1;
        this.villagers = res.villagers || [];

        // Bewohner zufällig positionieren
        this.villagersPositions = Array.from({ length: this.villagers.length }, () => ({
          x: Math.random() * 380,
          y: Math.random() * 380,
          dx: (Math.random() - 0.5) * 2,
          dy: (Math.random() - 0.5) * 2,
        }));

        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Fehler bei collectIncome:', err);
        this.isLoading = false;
      },
    });
  }

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.animate();
  }

  animate = () => {
    this.animationId = requestAnimationFrame(this.animate);
    this.ctx.clearRect(0, 0, 400, 400);

    // 🏠 Häuser zeichnen (2 pro Level)
    for (let i = 0; i < this.villageLevel * 2; i++) {
      const x = 40 + (i % 3) * 120;
      const y = 300 + Math.floor(i / 3) * -70;
      this.ctx.fillStyle = '#8B4513';
      this.ctx.fillRect(x, y, 60, 60);
    }

    // 👥 Bewohner animieren
    this.villagersPositions.forEach((v) => {
      v.x += v.dx;
      v.y += v.dy;

      if (v.x < 10 || v.x > 390) v.dx *= -1;
      if (v.y < 10 || v.y > 390) v.dy *= -1;

      this.ctx.beginPath();
      this.ctx.arc(v.x, v.y, 10, 0, Math.PI * 2);
      this.ctx.fillStyle = '#3498db';
      this.ctx.fill();
    });
  };

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
  }
}