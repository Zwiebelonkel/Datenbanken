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
import { MoneyService } from '../../services/money.service';

interface Villager {
  id: number;
  name: string;
  level: number;
  income: number;
}

type VillagerState = 'goingToMine' | 'working' | 'goingToMarket' | 'selling' | 'goingHome' | 'resting';

interface VillagerAnim extends Villager {
  x: number;
  y: number;
  state: VillagerState;
  targetX: number;
  targetY: number;
  workTimer: number;
  restTimer: number;
  homeX: number;
  homeY: number;
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
  unsavedEarnings = 0;


  villageLevel = 1;
  villagers: VillagerAnim[] = [];
  incomePerMinute = 0;
  showVillagerPopup = false;

  animationId = 0;
  ctx!: CanvasRenderingContext2D;

  mine = { x: 0, y: 0 };
  market = { x: 0, y: 0 };

  constructor(
    private villageService: VillageService,
    private profileService: ProfileService,
    private auth: AuthService,
    private moneyService: MoneyService
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
        this.incomePerMinute = res.villagers.reduce((sum, v) => sum + v.income, 0);

        this.villagers = res.villagers.map((v, i) => {
          const houseIndex = Math.floor(i / 2);
          const col = houseIndex % 3;
          const row = Math.floor(houseIndex / 3);
          const baseHomeX = 40 + col * 120 + 30;
          const baseHomeY = 70 + row * 80; // z.B. mit Verschiebung nach unten

          // Jetzt Bewohner horizontal versetzt positionieren, z.B. +/- 8px
          const homeX = baseHomeX + (i % 2 === 0 ? -8 : 8);
          const homeY = baseHomeY;

          return {
            ...v,
            x: homeX,
            y: homeY,
            state: 'goingToMine',
            targetX: this.mine.x + 20,
            targetY: this.mine.y + 20,
            workTimer: 0,
            restTimer: 0,
            homeX,
            homeY,
          };
        });

        this.isLoading = false;
        //this.startEarningLoop();
      },
      error: (err) => {
        console.error('❌ Fehler bei collectIncome:', err);
        this.isLoading = false;
      },
    });
  }

ngAfterViewInit() {
  const canvas = this.canvasRef.nativeElement;

  const neededRows = Math.ceil(this.villageLevel / 3);
  const canvasHeight = Math.max(400, neededRows * 80 + 100);

  const renderWidth = 380;
  canvas.width = renderWidth;
  canvas.height = canvasHeight;

  canvas.style.width = renderWidth + 'px';
  canvas.style.height = canvasHeight + 'px';

  this.ctx = canvas.getContext('2d')!;
  this.updateCanvasHeight();

  // ➕ Zentriere Mine und Markt
  this.mine.x = renderWidth / 2 - 60;
  this.market.x = renderWidth / 2 + 20;
  this.mine.y = 10;
  this.market.y = 10;

  this.animate();
}


  updateCanvasHeight() {
    const canvas = this.canvasRef.nativeElement;
    const neededRows = Math.ceil(this.villageLevel / 3);
    const canvasHeight = Math.max(400, neededRows * 80 + 100);

    const renderWidth = 380;
    canvas.width = renderWidth;
    canvas.height = canvasHeight;
    canvas.style.width = renderWidth + 'px';
    canvas.style.height = canvasHeight + 'px';
  }

  getUpgradeCost(level: number): number {
    return 10 * (level + 1);
  }

collectEarnings() {
  const username = this.auth.getUsername();
  if (!username || this.unsavedEarnings === 0) return;

  this.isLoading = true;

  this.moneyService
    .updateMoney({ username, amount: this.unsavedEarnings })
    .subscribe({
      next: () => {
        this.unsavedEarnings = 0;
        this.loadMoney(); // ✅ Geld neu laden aus dem Server
        // this.soundService.playSound('win.aac', 0.5); // Falls du einen Sound willst
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Fehler beim Geld abholen:', err);
        this.isLoading = false;
      },
    });
}

  loadMoney() {
  const username = this.auth.getUsername();
  if (!username) return;

  this.profileService.getUserStats(username).subscribe({
    next: (stats) => {
      this.money = stats.money;
    },
    error: (err) => {
      console.error('❌ Fehler beim Laden des Geldes:', err);
    },
  });
}


  upgradeVillager(villager: VillagerAnim) {
    this.isLoading = true;

    const upgradeCost = this.getUpgradeCost(villager.level);

    this.villageService.upgradeVillager(villager.id).subscribe({
      next: (res) => {
        villager.level = res.newLevel;
        villager.income = res.newIncome;
        this.money = res.newMoney;
        this.incomePerMinute = this.villagers.reduce((sum, v) => sum + v.income, 0);
        this.isLoading = false;
      },
      error: (err) => {
        alert(err.error.message || 'Fehler beim Upgrade');
        this.isLoading = false;
      },
    });
  }

  animate = () => {
    this.animationId = requestAnimationFrame(this.animate);

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 🏠 Häuser
    const numHouses = Math.ceil(this.villagers.length / 2);

    for (let i = 0; i < numHouses; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 40 + col * 120;
      const y = 75 + row * 80;
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(x, y, 60, 60);
    }

    // ⛏ Mine
    this.ctx.fillStyle = '#666';
    this.ctx.fillRect(this.mine.x, this.mine.y, 40, 40);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('⛏', this.mine.x + 10, this.mine.y + 25);

    // 💰 Markt
    this.ctx.fillStyle = '#999';
    this.ctx.fillRect(this.market.x, this.market.y, 40, 40);
    this.ctx.fillStyle = '#2ecc71';
    this.ctx.fillText('💰', this.market.x + 10, this.market.y + 25);

    // 👥 Bewohner-Logik
    this.villagers.forEach((v) => {
      const speed = 1;

      // Bewegung
      const dx = v.targetX - v.x;
      const dy = v.targetY - v.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        v.x += (dx / dist) * speed;
        v.y += (dy / dist) * speed;
      } else {
        switch (v.state) {
          case 'goingToMine':
            v.state = 'working';
            v.workTimer = 30 + Math.random() * 120; // (0.5s bis 2.5s)
            break;
          case 'working':
            v.workTimer--;
            if (v.workTimer <= 0) {
              v.state = 'goingToMarket';
              v.targetX = this.market.x + 20;
              v.targetY = this.market.y + 20;
            }
            break;
          case 'goingToMarket':
            v.state = 'selling';
            break;
          case 'selling':
            this.unsavedEarnings += v.income; // ✅ NEU
            v.state = 'goingHome';
            v.targetX = v.homeX;
            v.targetY = v.homeY;
            break;
          case 'goingHome':
            v.state = 'resting';
            v.restTimer = 30 + Math.random() * 120; // (0.5s bis 2.5s)
            break;
          case 'resting':
            v.restTimer--;
            if (v.restTimer <= 0) {
              v.state = 'goingToMine';
              v.targetX = this.mine.x + 20;
              v.targetY = this.mine.y + 20;
            }
            break;
        }
      }

      this.ctx.beginPath();
      this.ctx.arc(v.x, v.y, 10, 0, Math.PI * 2);
      this.ctx.fillStyle = '##2ecc71';
      this.ctx.fill();
    });
  };

  upgrade() {
    this.isLoading = true;

    this.villageService.upgradeVillage().subscribe({
      next: (res) => {
        this.villageLevel = res.newLevel;
        this.money = res.newMoney;

        this.villageService.collectIncome().subscribe({
          next: (res) => {
            this.earned = res.earned;
            this.minutesPassed = res.minutesPassed;
            this.money += res.earned;

            this.villageLevel = res.villageLevel;
            this.incomePerMinute = res.villagers.reduce((sum, v) => sum + v.income, 0);

            this.villagers = res.villagers.map((v, i) => {
              const col = i % 3;
              const row = Math.floor(i / 3);
              const homeX = 40 + col * 120 + 30;
              const homeY = 70 + row * 80 + 30;
              return {
                ...v,
                x: homeX,
                y: homeY,
                state: 'goingToMine',
                targetX: this.mine.x + (i % 2) * 10,
                targetY: this.mine.y + Math.floor(i % 2) * 10,
                workTimer: 0,
                restTimer: 0,
                homeX,
                homeY,
              };
            });

            this.updateCanvasHeight();
            this.isLoading = false;
          },
          error: () => (this.isLoading = false),
        });
      },
      error: () => (this.isLoading = false),
    });
  }

//  startEarningLoop() {
//    setInterval(() => {
//      const perSecond = this.incomePerMinute / 60;
//      this.unsavedEarnings += perSecond;
//    }, 1000);
//  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
  }
}
