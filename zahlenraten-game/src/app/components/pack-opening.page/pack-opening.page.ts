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
import { SoundsService } from '../../services/sound.service';
import { RGBELoader } from 'three-stdlib';

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

          <ul class="pulls">
            <li
              *ngFor="let r of results"
              [class.mult]="r.type === 'multiplier'"
              [class.money]="r.type === 'money'"
              [class.xp]="r.type === 'xp'"
            >
              <span class="pill">{{ renderOutcome(r) }}</span>
            </li>
          </ul>

          <div class="actions">
            <button class="btn" (click)="backToShop()">Zurück zum Shop</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      li {
        background: none;
      }
      .wrap {
        position: relative;
        width: 100%;
        height: 50rem;
        border-radius: 16px;
        overflow: hidden;
      }
      .pack-canvas {
        width: 100%;
        height: 100%;
        display: block;
        background: transparent;
      }
      .open-btn {
        position: absolute;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        padding: 0.7rem 1.1rem;
        border-radius: 12px;
        font-weight: 800;
        border: none;
        cursor: pointer;
      }
      .overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(4px);
      }
      .card {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 14px;
        padding: 1.25rem 1.5rem;
        min-width: 280px;
        text-align: center;
        color: #fff;
        width: min(560px, 90vw);
      }
      .title {
        font-weight: 800;
        opacity: 0.9;
        margin-bottom: 0.75rem;
      }
      .pulls {
        list-style: none;
        padding: 0;
        margin: 0 0 1rem 0;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0.5rem;
      }
      .pulls li {
        display: flex;
        justify-content: center;
      }
      .pill {
        display: inline-block;
        padding: 0.5rem 0.7rem;
        font-weight: 900;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        white-space: nowrap;
      }
      @media (max-width: 640px) {
        .pulls {
          grid-template-columns: repeat(2, 1fr);
        }
      }
      @media (max-width: 420px) {
        .wrap {
          height: 460px;
        }
      }
    `,
  ],
})
export class PackOpeningPageComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('wrap', { static: true }) wrapRef!: ElementRef<HTMLDivElement>;

  pack: PackKind = 'basic';
  openClipName: string | null = 'Open';

  // UI state
  isOpening = false;
  overlayShown = false; // gezeigt nach Clip-Ende (damit Button weg ist)
  revealed = false; // Overlay sichtbar

  // Ergebnisse (5 Karten)
  results: CardOutcome[] = [];

  // Three.js
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

  private cardActions: THREE.AnimationAction[] = [];
  private playingActions = new Set<THREE.AnimationAction>(); // alles was gerade läuft

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sounds: SoundsService
  ) {}

  // ---------- lifecycle ----------
  ngAfterViewInit(): void {
    const qp = (
      this.route.snapshot.queryParamMap.get('pack') || 'Basic'
    ).toLowerCase();
    this.pack = qp === 'premium' || qp === 'ultra' ? (qp as PackKind) : 'basic';

    const canvas = this.canvasRef.nativeElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace; // (fallback: outputEncoding = sRGBEncoding)
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25; // ↑ heller (1.2–1.6)
    // this.renderer.physicallyCorrectLights = true;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    this.onResize();
    window.addEventListener('resize', this.onResize);

    // heller, weicher, mit Rim-Light
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
      this.scene.environment = env; // realistische Reflektionen/Belichtung
      // this.scene.background = env;        // nur falls du das HDR als BG willst
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

  // ---------- model / clips ----------
  private fileForPack(kind: PackKind): string {
    switch (kind) {
      case 'basic':
        return 'assets/models/basic.glb';
      case 'premium':
        return 'assets/models/premium.glb';
      case 'ultra':
        return 'assets/models/ultra.glb';
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

      // Open-Action bestimmen (Open > erster Nicht-Idle > erster Clip)
      this.openAction =
        (this.openClipName ? this.actions.get(this.openClipName) : undefined) ??
        [...this.actions.values()].find(
          (a) => (a.getClip().name || '').toLowerCase() !== 'idle'
        ) ??
        [...this.actions.values()][0];

      // Alle cardX-Actions einsammeln (zulassen: card1, Card_2, card-03, card3Action …)
      const cardRe = /^card[\s_\-]*\d+/i;
      this.cardActions = [...this.actions.entries()]
        .filter(([name]) => cardRe.test(name))
        .map(([, a]) => a);

      // Wenn irgendeine laufende Action fertig ist, aus dem Set entfernen;
      // sobald keine mehr läuft -> Overlay einblenden
      this.mixer.addEventListener('finished', (ev: any) => {
        const a = ev?.action as THREE.AnimationAction | undefined;
        if (!a || !this.playingActions.has(a)) return;
        this.playingActions.delete(a);

        if (this.playingActions.size === 0 && !this.overlayShown) {
          this.isOpening = false;
          this.overlayShown = true;
          setTimeout(() => {
            this.revealed = true;
            this.sounds.playSound('message.aac', 0.8);
            // -> hier z.B. Server-Gutschrift
          }, 250);
        }
      });
    }
  }

  // ---------- open ----------
  playOpen() {
    if (this.isOpening || this.overlayShown) return;

    // 5 Ergebnisse sofort festziehen (werden erst nach den Clips angezeigt)
    if (this.results.length === 0) {
      this.results = this.drawMany(this.pack, 5);
    }

    if (this.mixer && (this.openAction || this.cardActions.length)) {
      this.isOpening = true;

      // Idle ausblenden
      const idle = this.actions.get('Idle');
      idle?.fadeOut(0.2);

      // Set der laufenden Actions leeren und neu befüllen
      this.playingActions.clear();

      // Open-Clip + alle cardX-Clips gemeinsam starten
      const toPlay: THREE.AnimationAction[] = [];
      if (this.openAction) toPlay.push(this.openAction);
      toPlay.push(...this.cardActions);

      // Falls keine cardX im File: optional ALLE (außer Idle) mitspielen lassen
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
      }

      for (const a of toPlay) {
        this.playingActions.add(a);
        a.reset()
          .setEffectiveTimeScale(1)
          .setEffectiveWeight(1)
          .fadeIn(0.15)
          .play();
      }

      this.sounds.playSound('hardPop.aac', 0.5);
      return;
    }

    // Fallback ohne Clips
    this.isOpening = true;
    setTimeout(() => {
      this.isOpening = false;
      this.overlayShown = true;
      this.revealed = true;
      this.sounds.playSound('message.aac', 0.8);
    }, 900);
  }

  // ---------- render loop ----------
  private animate = () => {
    this.rafId = requestAnimationFrame(this.animate);
    const dt = this.clock.getDelta();
    this.elapsedTime += dt;

    this.mixer?.update(dt);

    // Kamera im Orbit um den Mittelpunkt (0,1,0) mit Radius und konstanter Höhe
    const radius = 9; // Abstand zur Mitte, passe an dein Modell an
    const height = 0; // Kamera-Höhe
    const speed = 0.6; // Drehgeschwindigkeit (Radians/Sekunde)
    const angle = this.elapsedTime * speed;

    this.camera.position.set(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );

    this.camera.lookAt(0, 2, 0);

    this.renderer.render(this.scene, this.camera);
  };

  // ---------- helpers ----------
  private normalizeAndCenter(root: THREE.Object3D) {
    // Bounding-Box
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Objekt zentrieren
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;

    const FRONT_YAW_DEG = 90;
    root.rotation.set(0, THREE.MathUtils.degToRad(FRONT_YAW_DEG), 0);

    const padding = 2.5;
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect =
      this.canvasRef.nativeElement.clientWidth /
      Math.max(1, this.canvasRef.nativeElement.clientHeight);

    // Distanz so wählen, dass Höhe/Breite ins Bild passen
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
        if (Array.isArray(o.material))
          o.material.forEach((m: any) => m.dispose?.());
        else o.material.dispose?.();
      }
      if (o.texture) o.texture.dispose?.();
    });
  }

  // Räumt das aktuell geladene GLB + Mixer auf
  private disposeScene() {
    // Animation-Mixer freigeben
    if (this.mixer) {
      this.mixer.stopAllAction();
      try {
        // optional: Cache sauber leeren, falls unterstützt
        // @ts-ignore
        this.mixer.uncacheRoot(this.glbRoot);
      } catch {}
      this.mixer = null;
    }
    this.actions.clear();

    // Modell aus der Szene entfernen und Geometrien/Materialien entsorgen
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

  // ---------- drawing / display ----------
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
      return o.value; // z.B. "1.5x"
    }
    if (o.type === 'money') return `💰 ${o.value} €`;
    if (o.type === 'xp') return `⭐ +${o.value} XP`;
    return '—';
  }

  backToShop() {
    this.router.navigate(['/card-shop']);
  }
}
