import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '../loader/loader.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { VillageService } from '../../services/village.service';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { MoneyService } from '../../services/money.service';
// import {AchievementService } from '../../services/achievement.service';

interface Villager {
  id: number;
  name: string;
  level: number;
  income: number;
  speed: number;
  stamina: number;
}

type VillagerState =
  | 'goingToMine'
  | 'working'
  | 'goingToMarket'
  | 'selling'
  | 'goingToStorage'
  | 'storing'
  | 'goingHome'
  | 'resting';

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
  imports: [CommonModule, LoaderComponent, SidebarComponent, FormsModule],
})
export class VillageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('villageCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  money = 0;
  earned = 0;
  minutesPassed = 0;
  isLoading = true;
  unsavedEarnings = 0;
  editingVillagerId: number | null = null;
  newName = '';
  achievementMessage: string | null = null;
  villageLevel = 1;
  villagers: VillagerAnim[] = [];
  incomePerMinute = 0;
  showVillagerPopup = false;
  tooltip = { visible: false, x: 0, y: 0, text: '' };
  
  upgradeAmount: number = 5; // Sichtbar im Input
  defaultUpgradeAmount: number = 10; // Tatsächlich verwendet beim Klick


  animationId = 0;
  ctx!: CanvasRenderingContext2D;
  // === Time & Balancing (added) ===
  private lastTime = performance.now();
  private readonly BASE_WORK_TIME = 10; // seconds
  private readonly BASE_REST_TIME = 5; // seconds
  private readonly MIN_PHASE_TIME = 0.5; // seconds

  private efficiencyFromStamina(staminaRaw: number): number {
    const s = Math.max(0.5, staminaRaw || 0.5);
    // ~2x after ~20 upgrades (0.5 -> 10.5)
    return 1 + 0.1 * (s - 0.5);
  }

  mine = { x: 0, y: 0 };
  market = { x: 0, y: 0 };
  storage = { x: 0, y: 0 };

  constructor(
    private villageService: VillageService,
    private profileService: ProfileService,
    private auth: AuthService,
    private moneyService: MoneyService //    private achievementService: AchievementService
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
        const OFFLINE_EARNINGS_FACTOR = 0.05;
        res.earned = Math.floor((res.earned || 0) * OFFLINE_EARNINGS_FACTOR);
        this.earned = res.earned;
        this.minutesPassed = res.minutesPassed;
        this.money += res.earned;

        this.villageLevel = res.villageLevel || 1;
        this.incomePerMinute = res.villagers.reduce(
          (sum, v) => sum + v.income,
          0
        );

        this.villagers = res.villagers.map((v, i) => {
          const houseIndex = Math.floor(i / 2);
          const col = houseIndex % 3;
          const row = Math.floor(houseIndex / 3);
          const baseHomeX = 40 + col * 120 + 30;
          const baseHomeY = 75 + row * 80; // Wichtig: gleiche Y-Basis wie im animate für Häuser
          const homeX = baseHomeX + (i % 2 === 0 ? -8 : 8);
          const homeY = baseHomeY + 30; // Bewohner 30px unter Haus-Y, also in der Hausmitte

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
    this.mine.x = renderWidth / 2 - 100;
    this.market.x = renderWidth / 2 + 60;
    this.storage.x = renderWidth / 2 + 60;
    this.mine.y = 10;
    this.market.y = 10;
    this.storage.y = 50;


    this.updateCanvasHeight();
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

  onCanvasHover(event: MouseEvent) {
    const canvas = this.canvasRef.nativeElement;

    // Mausposition RELATIV zum Canvas (keine Rect-Berechnung nötig)
    const mouseX = event.offsetX ?? 0;
    const mouseY = event.offsetY ?? 0;

    // Tooltip-Position: Canvas-Offset innerhalb der Card + Mausposition
    const offLeft = canvas.offsetLeft;
    const offTop = canvas.offsetTop;

    let found = false;
    for (const v of this.villagers) {
      // Hit-Test im Canvas-Koordinatensystem
      if (Math.hypot(mouseX - v.x, mouseY - v.y) <= 12) {
        this.tooltip = {
          visible: true,
          x: offLeft + mouseX + 12,
          y: offTop + mouseY + 12,
          text: `${v.name}  ⭐${v.level}`,
        };
        found = true;
        break;
      }
    }
    if (!found) this.tooltip.visible = false;
  }

  get villagerCounts() {
    return {
      goingToMine: this.villagers.filter((v) => v.state === 'goingToMine')
        .length,
      resting: this.villagers.filter((v) => v.state === 'resting').length,
      working: this.villagers.filter((v) => v.state === 'working').length,
      goingToMarket: this.villagers.filter((v) => v.state === 'goingToMarket')
        .length,
      goingHome: this.villagers.filter((v) => v.state === 'goingHome').length,
    };
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

  upgradeVillager(villager: VillagerAnim, times: number = 1) {
    this.isLoading = true;
    this.villageService.upgradeVillager(villager.id, times).subscribe({
      next: (res) => {
        villager.level = res.newLevel;
        villager.income = res.newIncome;
        this.money = res.newMoney;
        this.incomePerMinute = this.villagers.reduce(
          (sum, v) => sum + v.income,
          0
        );
        this.isLoading = false;
      },
      error: (err) => {
        alert(err.error.message || 'Fehler beim Upgrade');
        this.isLoading = false;
      },
    });
  }

  upgradeSpeed(villager: VillagerAnim, times: number = 1) {
    this.isLoading = true;

    const totalCost = this.getTotalUpgradeCost(villager.speed, times);
    if (this.money < totalCost) {
      alert('Nicht genug Geld für Speed-Upgrade!');
      this.isLoading = false;
      return;
    }

    this.villageService.upgradeSpeed(villager.id, times).subscribe({
      next: (res) => {
        villager.speed = res.newSpeed;
        this.money = res.newMoney;
        this.incomePerMinute = this.villagers.reduce(
          (sum, v) => sum + v.income,
          0
        );
        this.isLoading = false;
      },
      error: (err) => {
        alert(err.error.message || 'Fehler beim Speed-Upgrade');
        this.isLoading = false;
      },
    });
  }

  upgradeStamina(villager: VillagerAnim, times: number = 1) {
    this.isLoading = true;

    const totalCost = this.getTotalUpgradeCost(villager.stamina, times);
    if (this.money < totalCost) {
      alert('Nicht genug Geld für Ausdauer-Upgrade!');
      this.isLoading = false;
      return;
    }

    this.villageService.upgradeStamina(villager.id, times).subscribe({
      next: (res) => {
        villager.stamina = res.newStamina;
        this.money = res.newMoney;
        this.incomePerMinute = this.villagers.reduce(
          (sum, v) => sum + v.income,
          0
        );
        this.isLoading = false;
      },
      error: (err) => {
        alert(err.error.message || 'Fehler beim Ausdauer-Upgrade');
        this.isLoading = false;
      },
    });
  }

  getTotalUpgradeCost(currentValue: number, times: number): number {
    let total = 0;
    for (let i = 0; i < times; i++) {
      total += this.getUpgradeCost(currentValue + i);
    }
    return total;
  }

  animate = (now: number = performance.now()) => {
    this.animationId = requestAnimationFrame(this.animate);

    // Δt in seconds (frame independent)
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (dt > 0.1) dt = 0.1;

    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 🏠 Häuser zeichnen
    const numHouses = Math.ceil(this.villagers.length / 2);
    for (let i = 0; i < numHouses; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 40 + col * 120;
      const y = 75 + row * 80;

      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(x, y, 60, 60);
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, 60, 60);
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

      //📦 Storage
    this.ctx.fillStyle = '#999';
    this.ctx.fillRect(this.storage.x, this.storage.y, 40, 40);
    this.ctx.fillStyle = '#2ecc71';
    this.ctx.fillText('📦', this.storage.x + 10, this.storage.y + 25);

    // Bewohner bewegen/aktualisieren
    this.villagers.forEach((v) => {
      const dx = v.targetX - v.x;
      const dy = v.targetY - v.y;
      const dist = Math.hypot(dx, dy);

      // Bewegung: px/s * s
      const step = Math.max(1, v.speed) * dt;
      if (dist > step) {
        const nx = dx / dist,
          ny = dy / dist;
        v.x += nx * step;
        v.y += ny * step;
      } else {
        v.x = v.targetX;
        v.y = v.targetY;
      }

      // Zustandswechsel/Timer
      if (dist <= 1) {
        switch (v.state) {
          case 'goingToMine':
            v.state = 'working';
            {
              const eff = this.efficiencyFromStamina(v.stamina);
              v.workTimer = Math.max(
                this.MIN_PHASE_TIME,
                this.BASE_WORK_TIME / eff
              );
            }
            break;

          case 'goingToMarket':
            v.state = 'selling';
            v.workTimer = 1; // fixed 1s
            break;

          case 'goingHome':
            v.state = 'resting';
            {
              const eff = this.efficiencyFromStamina(v.stamina);
              v.restTimer = Math.max(
                this.MIN_PHASE_TIME,
                this.BASE_REST_TIME / eff
              );
            }
            break;
        }
      }

      switch (v.state) {
        case 'working':
          v.workTimer -= dt;
          if (v.workTimer <= 0) {
            v.state = 'goingToMarket';
            v.targetX = this.market.x + 20;
            v.targetY = this.market.y + 20;
          }
          break;

case 'selling':
  v.workTimer -= dt;
  if (v.workTimer <= 0) {
    v.state = 'goingToStorage';
    v.targetX = v.homeX;
    v.targetY = v.homeY;
  }
  break;
            case 'goingToStorage':
              v.state = 'storing';
              v.workTimer = 1; // fixed 1s
            break;

          case 'storing':
  v.workTimer -= dt;
  if (v.workTimer <= 0) {
    // ➕ Einkommen hinzufügen
    this.unsavedEarnings += v.income;

    v.state = 'goingHome';
    v.targetX = v.homeX;
    v.targetY = v.homeY;
  }
  break;


        case 'resting':
          v.restTimer -= dt;
          if (v.restTimer <= 0) {
            v.state = 'goingToMine';
            v.targetX = this.mine.x + 20;
            v.targetY = this.mine.y + 20;
          }
          break;
      }

      // 🎨 Farbe nach Status
      switch (v.state) {
        case 'goingToMine':
          this.ctx.fillStyle = '#2ecc71';
          break;
        case 'working':
          this.ctx.fillStyle = '#e67e22';
          break;
        case 'goingToMarket':
          this.ctx.fillStyle = '#9b59b6';
          break;
        case 'selling':
          this.ctx.fillStyle = '#f1c40f';
          break;
        case 'goingHome':
          this.ctx.fillStyle = '#e74c3c';
          break;
        case 'resting':
          this.ctx.fillStyle = '#3498db';
          break;
        default:
          this.ctx.fillStyle = '#95a5a6';
      }

      // Bewohner zeichnen
      this.ctx.beginPath();
      this.ctx.arc(v.x, v.y, 10, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.lineWidth = 2;
      this.ctx.strokeStyle = '#000';
      this.ctx.stroke();
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
            const OFFLINE_EARNINGS_FACTOR = 0.05;
            res.earned = Math.floor(
              (res.earned || 0) * OFFLINE_EARNINGS_FACTOR
            );
            this.earned = res.earned;
            this.minutesPassed = res.minutesPassed;
            this.money += res.earned;

            this.villageLevel = res.villageLevel;
            this.incomePerMinute = res.villagers.reduce(
              (sum, v) => sum + v.income,
              0
            );

            this.villagers = res.villagers.map((v, i) => {
              const houseIndex = Math.floor(i / 2);
              const col = houseIndex % 3;
              const row = Math.floor(houseIndex / 3);
              const baseHomeX = 40 + col * 120 + 30;
              const baseHomeY = 75 + row * 80; // Wichtig: gleiche Y-Basis wie im animate für Häuser
              const homeX = baseHomeX + (i % 2 === 0 ? -8 : 8);
              const homeY = baseHomeY + 30; // Bewohner 30px unter Haus-Y, also in der Hausmitte

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
  enableRename(v: VillagerAnim) {
    this.editingVillagerId = v.id;
    this.newName = v.name;
    setTimeout(() => {
      // Fokussiert das Input-Feld nach dem Anzeigen (optional)
      const inputs = document.querySelectorAll('input');
      const lastInput = inputs[inputs.length - 1] as HTMLInputElement;
      lastInput?.focus();
    });
  }

  renameVillager(v: VillagerAnim) {
    if (!this.newName.trim() || this.newName === v.name) {
      this.editingVillagerId = null;
      return;
    }

    this.villageService.renameVillager(v.id, this.newName.trim()).subscribe({
      next: (res) => {
        v.name = res.newName; // vom Backend zurückgegeben
        this.editingVillagerId = null;
      },
      error: (err) => {
        console.error('Fehler beim Umbennen:', err);
        alert('Name konnte nicht geändert werden.');
        this.editingVillagerId = null;
      },
    });
  }

  //unlockAch(name: string) {
  //  this.achievementService
  //    .unlockAchievement(this.authService.getUserId(), name)
  //    .subscribe({
  //      next: (res) => {
  //        if (res.unlocked) {
  //          this.achievementService.showAchievementMessage(
  //           `🎉 Erfolg freigeschaltet: ${res.name}`
  //         );
  //          this.achievementService.emojiRain(
  //            '🎖️',
  //            document.querySelector('.emoji-rain-container')
  //          );
  //          this.soundService.playSound('message.aac');
  //        }
  //      },
  //      error: (err) => {
  //        console.error('❌ Fehler beim Freischalten des Erfolgs:', err);
  //      },
  //    });
  //}

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
  }
}
