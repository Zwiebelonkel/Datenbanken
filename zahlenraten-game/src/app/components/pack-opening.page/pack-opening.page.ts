import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { RGBELoader } from 'three-stdlib';

/* --- Services aus der alten Logik --- */
import { CardsService } from '../../services/cards.service';
import { MoneyService } from '../../services/money.service';
import { AuthService } from '../../services/auth.service';
import { ProfileService } from '../../services/profile.service';
import { AchievementService } from '../../services/achievement.service';
import { SoundsService } from '../../services/sound.service';

type PackKind = 'basic' | 'premium' | 'ultra';

type CardOutcome =
  | { type: 'multiplier'; value: string; chance: number }
  | { type: 'money'; value: number; chance: number }
  | { type: 'xp'; value: number; chance: number };

@Component({
  selector: 'app-pack-opening-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wrap" #wrap>
      <canvas #canvas class="pack-canvas" aria-label="Pack Opening 3D"></canvas>

      <button
        *ngIf="!isOpening && !overlayShown"
        type="button"
        class="open-btn"
        (click)="playOpen()"
      >
        Pack öffnen
      </button>

      <div class="overlay" *ngIf="revealed">
        <div class="card">
          <div class="title">🎉 Du hast gezogen:</div>

          <div class="pulls cards">
            <div
              class="flip-inner"
              *ngFor="let r of results; let i = index"
              [class.flipped]="flippedCards[i]"
            >
              <div class="flip-front" [ngClass]="pack.toLowerCase()">
                <img src="assets/logo.png" class="logo center" />
              </div>
              <div class="flip-back" [ngClass]="pack.toLowerCase()">
                <img src="assets/logo.png" class="emoji top-left" />
                <img src="assets/logo.png" class="emoji bottom-right" />
                <p class="multiplier-text">{{ renderOutcome(r) }}</p>
                <div class="sparkles"></div>
              </div>
            </div>
          </div>

          <div class="actions">
            <button class="btn" (click)="backToShop()">Zurück zum Shop</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [/* … (unverändert aus deiner neuen Version) … */]
})
export class PackOpeningPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;

  /* ---------- Frontend/UI ---------- */
  pack: PackKind = 'basic';
  openClipName: string | null = 'Open';
  isOpening = false;
  overlayShown = false;
  revealed = false;
  flippedCards: boolean[] = [];
  results: CardOutcome[] = [];

  /* ---------- Backend-State (aus alter Logik) ---------- */
  username: string = '';
  money: number = 0;
  isLoading = true;
  currentLevel: number = 0;
  message = '';
  achievementMessage: string | null = null;

  /** Preise wie im alten Component (Basic 40, Premium 120, Ultra 360) */
  private packPrices: Record<PackKind, number> = {
    basic: 40,
    premium: 120,
    ultra: 360,
  };

  /* ---------- Chancen wie in alter Logik (auf lowercase Packs gemappt) ---------- */
  private chances: Record<PackKind, CardOutcome[]> = {
    basic: [
      { type: 'multiplier', value: '1.2x', chance: 50 },
      { type: 'multiplier', value: '1.5x', chance: 15 },
      { type: 'multiplier', value: '2x', chance: 5 },
      { type: 'multiplier', value: '-1', chance: 5 },
      { type: 'money', value: 50, chance: 15 },
      { type: 'xp', value: 25, chance: 10 },
    ],
    premium: [
      { type: 'multiplier', value: '1.5x', chance: 35 },
      { type: 'multiplier', value: '2x', chance: 15 },
      { type: 'multiplier', value: '5x', chance: 10 },
      { type: 'multiplier', value: '-1', chance: 10 },
      { type: 'multiplier', value: '-2', chance: 5 },
      { type: 'money', value: 100, chance: 15 },
      { type: 'xp', value: 50, chance: 10 },
    ],
    ultra: [
      { type: 'multiplier', value: '2x', chance: 25 },
      { type: 'multiplier', value: '5x', chance: 20 },
      { type: 'multiplier', value: '10x', chance: 3 },
      { type: 'multiplier', value: '-1', chance: 15 },
      { type: 'multiplier', value: '-2', chance: 5 },
      { type: 'multiplier', value: '-3', chance: 1.5 },
      { type: 'money', value: 150, chance: 15 },
      { type: 'xp', value: 100, chance: 15 },
    ],
  };

  /* ---------- Three.js ---------- */
  private renderer!: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private rafId = 0;
  private elapsedTime = 0;

  private mixer: THREE.AnimationMixer | null = null;
  private glbRoot: THREE.Object3D | null = null;
  private actions = new Map<string, THREE.AnimationAction>();
  private openAction?: THREE.AnimationAction;
  private isInOpenView = false;
  private camLerpTime = 0;
  private cardActions: THREE.AnimationAction[] = [];
  private playingActions = new Set<THREE.AnimationAction>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    /* --- Services injizieren --- */
    private cardsService: CardsService,
    private moneyService: MoneyService,
    private authService: AuthService,
    private profileService: ProfileService,
    private achievementService: AchievementService,
    private sounds: SoundsService
  ) {}

  /* ============================ LIFECYCLE ============================ */
  ngAfterViewInit(): void {
    // Pack aus Query (basic/premium/ultra)
    const qp = (this.route.snapshot.queryParamMap.get('pack') || 'Basic').toLowerCase();
    this.pack = qp === 'premium' || qp === 'ultra' ? (qp as PackKind) : 'basic';

    // --- Backend Init: Username, Money, Level laden ---
    this.username = this.authService.getUsername() || '';
    this.loadMoney();
    if (this.username) {
      this.profileService.getUserStats(this.username).subscribe({
        next: (p) => (this.currentLevel = p.level ?? 0),
        error: (e) => console.error('❌ getUserStats fehlgeschlagen', e),
      });
    }

    // --- Three Setup ---
    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.onResize();
    window.addEventListener('resize', this.onResize);

    const amb = new THREE.AmbientLight(0xffffff, 0.35);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x404040, 0.9);
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(3, 6, 4);
    const rim = new THREE.DirectionalLight(0xffffff, 0.6);
    rim.position.set(-4, 3, 2);
    this.scene.add(amb, hemi, key, rim);

    this.scene.background = this.gradientTexture('#333333ff', '#000000ff');

    this.loadPackModel(this.pack).then(() => this.animate());
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    new RGBELoader().setPath('assets/').load('studio.hdr', (hdr) => {
      const env = pmrem.fromEquirectangular(hdr).texture;
      this.scene.environment = env;
      hdr.dispose?.();
      pmrem.dispose();
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.disposeScene();
    this.renderer?.dispose();
  }

  /* ============================ BACKEND PORT ============================ */

  /** Geld/Stats laden (wie vorher) */
  private loadMoney() {
    if (!this.username) return;
    this.isLoading = true;
    this.profileService.getUserStats(this.username).subscribe({
      next: (stats) => {
        this.money = stats.money;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Fehler beim Laden der Statistiken:', err);
        this.isLoading = false;
      },
    });
  }

  /** Kauf starten → Abzug → dann Animationen/Draw */
  async playOpen() {
    if (this.isOpening || this.overlayShown) return;

    // Preis prüfen
    const price = this.packPrices[this.pack] || 0;
    if (this.money < price) {
      this.message = '❌ Nicht genug Geld!';
      this.router.navigate(['/card-shop']);
      return;
    }

    // Geld abziehen (wie altes dropCardPack)
    this.isOpening = true; // UI blocken, damit nicht doppelt geklickt wird
    this.moneyService
      .updateMoney({ username: this.username, amount: -price })
      .subscribe({
        next: () => {
          this.money -= price;
          this.message = '';

          // Ergebnisse ziehen (5 Karten)
          if (this.results.length === 0) {
            this.results = this.drawMany(this.pack, 5);
            this.flippedCards = Array(this.results.length).fill(false);
          }

          // Animationen starten (wie vorher in neuer Version)
          if (this.mixer && (this.openAction || this.cardActions.length)) {
            // Idle ausblenden
            const idle = this.actions.get('Idle');
            idle?.fadeOut(0.2);

            this.playingActions.clear();
            const toPlay: THREE.AnimationAction[] = [];
            if (this.openAction) toPlay.push(this.openAction);
            toPlay.push(...this.cardActions);

            if (this.cardActions.length === 0) {
              for (const [name, a] of this.actions) {
                if (
                  name.toLowerCase() !== 'idle' &&
                  a !== this.openAction &&
                  !/^card\d+$/i.test(name)
                ) {
                  toPlay.push(a);
                }
              }
              this.isInOpenView = true;
              this.camLerpTime = 0;
            }

            for (const a of toPlay) {
              this.playingActions.add(a);
              a.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.15).play();
            }

            this.sounds.playSound('hardPop.aac', 0.5);
          } else {
            // Fallback ohne Clips
            setTimeout(() => {
              this.isOpening = false;
              this.overlayShown = true;
              this.revealed = true;
              this.sounds.playSound('message.aac', 0.8);
              // Direkt nacheinander flippen und verbuchen
              this.flipAndApplySequentially();
            }, 900);
          }
        },
        error: (err) => {
          console.error('❌ Fehler beim Geldabzug:', err);
          this.message = '❌ Kauf fehlgeschlagen!';
          this.isOpening = false;
        },
      });
  }

  /** Nach jedem Flip wird das jeweilige Outcome serverseitig verbucht */
  private async flipAndApplySequentially() {
    for (let i = 0; i < this.flippedCards.length; i++) {
      await this.delay(200);
      this.flippedCards[i] = true;
      this.applyOutcome(this.results[i]); // <-- hier wird gebucht
    }
    this.sounds.playSound('message.aac', 0.8);
  }

  /** Server-Updates wie im alten drawCard(): addCard / updateMoney / addXp / Achievement */
  private applyOutcome(o: CardOutcome) {
    if (o.type === 'multiplier') {
      // parseFloat erlaubt "1.5x" und "-2" etc.
      const numericVal = parseFloat(o.value);
      if (o.value === '-3') {
        this.unlockAch('Joker 🃏'); // wie vorher
      }
      // Nur Multiplier-Karten speichern
      if (!Number.isNaN(numericVal)) {
        this.cardsService.addCard(numericVal).subscribe({
          next: () => console.log('Karte gespeichert:', o.value),
          error: (err) => console.error('❌ Fehler beim Speichern der Karte:', err),
        });
      }
    } else if (o.type === 'money') {
      this.moneyService
        .updateMoney({ username: this.username, amount: o.value })
        .subscribe({
          next: () => {
            this.money += o.value;
            console.log(`💰 +${o.value} Geld gutgeschrieben`);
          },
          error: (err) => console.error('❌ Fehler beim Hinzufügen von Geld:', err),
        });
    } else if (o.type === 'xp') {
      this.addXp(o.value);
    }
  }

  /** Achievement-Flow wie vorher; falls du Emoji-Regen willst, kannst du hier RainComponent triggern */
  private unlockAch(name: string) {
    this.achievementService.unlockAchievement(name).subscribe({
      next: (res) => {
        if (res.unlocked) {
          this.showAchievementMessage(`🎉 Erfolg freigeschaltet: ${res.name}`);
          this.addXp(20);
          // Optional: RainComponent aufrufen, falls im Template vorhanden:
          // this.rainComponent?.emojiRain('🎖️');
        }
      },
      error: (err) => console.error('❌ Fehler beim Unlock:', err),
    });
  }

  private showAchievementMessage(message: string) {
    this.achievementMessage = message;
    setTimeout(() => (this.achievementMessage = null), 3000);
  }

  private levelUp(newLevel: number) {
    this.achievementMessage = `🎉 Level up! Neues Level: ${newLevel}`;
    setTimeout(() => (this.achievementMessage = null), 3000);
  }

  private addXp(amount: number) {
    const user = this.authService.getUsername();
    if (!user) return;

    const prevLevel = this.currentLevel;
    this.profileService.addXp(user, amount).subscribe({
      next: (res) => {
        if (res.level > prevLevel) this.levelUp(res.level);
        this.currentLevel = res.level;
      },
      error: (err) => console.error('❌ XP-Update fehlgeschlagen', err),
    });
  }

  /* ============================ THREE: MODEL/CLIPS ============================ */
  private fileForPack(kind: PackKind): string {
    switch (kind) {
      case 'basic': return 'assets/models/basic.glb';
      case 'premium': return 'assets/models/premium.glb';
      case 'ultra': return 'assets/models/ultra.glb';
    }
  }

  private async loadPackModel(kind: PackKind): Promise<void> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(this.fileForPack(kind));

    if (this.glbRoot) {
      this.scene.remove(this.glbRoot);
      this.disposeObject(this.glbRoot);
    }
    this.actions.clear();
    this.mixer?.stopAllAction();
    this.mixer = null;

    this.glbRoot = gltf.scene;
    this.normalizeAndCenter(this.glbRoot);
    this.scene.add(this.glbRoot);

    if (gltf.animations?.length) {
      this.mixer = new THREE.AnimationMixer(this.glbRoot);
      gltf.animations.forEach((clip) => {
        const action = this.mixer!.clipAction(clip);
        action.clampWhenFinished = true;
        action.setLoop(THREE.LoopOnce, 1);
        this.actions.set(clip.name, action);
      });

      this.openAction =
        (this.openClipName ? this.actions.get(this.openClipName) : undefined) ??
        [...this.actions.values()].find(
          (a) => (a.getClip().name || '').toLowerCase() !== 'idle'
        ) ??
        [...this.actions.values()][0];

      const cardRe = /^card[\s_\-]*\d+/i;
      this.cardActions = [...this.actions.entries()]
        .filter(([name]) => cardRe.test(name))
        .map(([, a]) => a);

      this.mixer.addEventListener('finished', async (ev: any) => {
        const a = ev?.action as THREE.AnimationAction | undefined;
        if (!a || !this.playingActions.has(a)) return;
        this.playingActions.delete(a);

        if (this.playingActions.size === 0 && !this.overlayShown) {
          // Alle Clips fertig → Overlay zeigen + Karten nacheinander flippen & verbuchen
          this.isOpening = false;
          this.overlayShown = true;
          this.revealed = true;

          await this.delay(10);
          await this.flipAndApplySequentially(); // <— verbucht pro Karte
        }
      });
    }
  }

  /* ============================ RENDER LOOP ============================ */
  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();
    this.elapsedTime += dt;
    this.mixer?.update(dt);

    if (!this.isInOpenView) {
      const radius = 9;
      const height = 0;
      const speed = 0.6;
      const angle = this.elapsedTime * speed;
      this.camera.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
      this.camera.lookAt(0, 2, 0);
    } else {
      this.camLerpTime = Math.min(this.camLerpTime + dt / 1.2, 1);
      const start = new THREE.Vector3(10, 0, 0);
      const end = new THREE.Vector3(0, 12, 10);
      const pos = new THREE.Vector3().lerpVectors(start, end, this.camLerpTime);
      this.camera.position.copy(pos);
      this.camera.lookAt(0, 2, 0);
    }

    this.renderer.render(this.scene, this.camera);
  };

  /* ============================ HELPERS ============================ */
  private normalizeAndCenter(root: THREE.Object3D) {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;

    root.rotation.set(0, THREE.MathUtils.degToRad(90), 0);

    const padding = 2.5;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect =
      this.canvasRef.nativeElement.clientWidth /
      Math.max(1, this.canvasRef.nativeElement.clientHeight);

    const distY = (size.y * 0.5) / Math.tan(fov / 2);
    const distX = (size.x * 0.5) / (Math.tan(fov / 2) * aspect);
    const dist = Math.max(distX, distY) * padding;

    this.camera.position.set(0, size.y * 0.55, dist);
    this.camera.lookAt(0, size.y * 0.5, 0);
  }

  private gradientTexture(c1: string, c2: string): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 2);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 2);
    const tex = new THREE.Texture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((o: any) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        if (Array.isArray(o.material)) o.material.forEach((m: any) => m.dispose?.());
        else o.material.dispose?.();
      }
      if (o.texture) o.texture.dispose?.();
    });
  }

  private disposeScene() {
    if (this.mixer) {
      this.mixer.stopAllAction();
      try {
        // @ts-ignore
        this.mixer.uncacheRoot(this.glbRoot);
      } catch {}
      this.mixer = null;
    }
    this.actions.clear();
    if (this.glbRoot) {
      this.scene.remove(this.glbRoot);
      this.disposeObject(this.glbRoot);
      this.glbRoot = null;
    }
  }

  private onResize = () => {
    const el = this.wrapRef.nativeElement;
    const w = el.clientWidth || 600;
    const h = el.clientHeight || 520;
    this.renderer.setSize(w, h, false);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  };

  private drawMany(kind: PackKind, n: number): CardOutcome[] {
    const out: CardOutcome[] = [];
    for (let i = 0; i < n; i++) out.push(this.draw(kind));
    return out;
  }
  private draw(kind: PackKind): CardOutcome {
    const table = this.chances[kind];
    const total = table.reduce((a, c) => a + c.chance, 0);
    const r = Math.random() * total;
    let acc = 0;
    for (const o of table) {
      acc += o.chance;
      if (r <= acc) return o;
    }
    return table[table.length - 1];
  }

  renderOutcome(o: CardOutcome): string {
    if (o.type === 'multiplier') {
      if (o.value.startsWith('-')) {
        const hearts = Math.abs(parseInt(o.value, 10)) || 1;
        return `❤️ × ${hearts}`;
      }
      return o.value;
    }
    if (o.type === 'money') return `💰 ${o.value} €`;
    if (o.type === 'xp') return `⭐ +${o.value} XP`;
    return '—';
  }

  backToShop() {
    this.router.navigate(['/card-shop']);
  }

  private delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }
}