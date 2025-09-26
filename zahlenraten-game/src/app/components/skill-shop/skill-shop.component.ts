import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ProfileService,
  Skill,
  UserStats,
} from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { LoaderComponent } from '../loader/loader.component';
import { TutorialComponent } from '../tutorial/tutorial.component';
import { Title, Meta } from '@angular/platform-browser';


@Component({
  selector: 'app-skill-shop',
  standalone: true,
  imports: [
    CommonModule,
    SidebarComponent,
    LoaderComponent,
    TopbarComponent,
    TutorialComponent,
  ],
  templateUrl: './skill-shop.component.html',
  styleUrls: ['./skill-shop.component.scss'],
})
export class SkillShopComponent implements OnInit {
  username = '';
  isLoading = false;
  errorMsg: string | null = null;

  // app.component.ts

  skillsData = [
    {
      name: 'Der "Präzision"-Skill',
      emoji: '🎯',
      description:
        'erhöht deinen Score-Multiplikator, was bedeutet, dass du mehr Punkte pro Spiel erhältst.',
    },
    {
      name: 'Der "Businessman"-Skill',
      emoji: '💸',
      description:
        'erhöht deinen dauerhaften Geld-Multiplikator, was bedeutet, dass du mehr In-Game-Währung pro Spiel oder Abhebung verdienst.',
    },
    {
      name: 'Der "Ausdauer"-Skill',
      emoji: '💨',
      description:
        'senkt die erforderte Sieg-Streak, die du benötigst, um ein Leben zurück zu erhalten.',
    },
  ];

  tutorialTitle = 'Wie funktioniert das?';

  tutorialDescription =
    'Wenn du im Spiel ein Level aufsteigst, erhältst du einen Skillpunkt. Mit diesen Skillpunkten kannst du dir dann hier im Shop dauerhafte Vorteile für die zukünftigen Spiele kaufen. Der erforderte XP (Erfahrungspunkte)-Betrag für einen Level-Up steigt mit jedem Level an.';

  skills: Skill[] = [];

  // optional: blocke Doppelklicks pro Skill
  busy = new Set<string>();

  player: UserStats = {
    totalScore: 0,
    totalGames: 0,
    unlockedAchievements: 0,
    money: 0,
    highscore: 0,
    level: 1,
    xp: 0,
    xpThreshold: 100,
    xpPercent: 0,
    skills: [],
    skillPoints: 0,
    scoreMultiplier: 1.0,
    monetaryMultiplier: 1.0,
    streakNeeded: 15,
  };

  constructor(
    private profileService: ProfileService,
    private authService: AuthService,
    private titleService: Title,
    private metaService: Meta
  ) {
  }

  ngOnInit(): void {
    this.setSeoTags()
    this.username = this.authService.getUsername() ?? '';
    if (!this.username) {
      this.errorMsg = 'Bitte einloggen, um den Skill-Shop zu benutzen.';
      return;
    }
    this.loadData();
  }

  setSeoTags(): void {
    this.titleService.setTitle('SkillShop - CardCore');
  
    this.metaService.updateTag({ name: 'description', content: 'Verbessere dein Profil dauerhaft indem du mit Skillpunkten durch levelUp Skills verbesserst.' });
  
    this.metaService.updateTag({ property: 'og:title', content: 'SkillShop - CardCore' });
  
    this.metaService.updateTag({ property: 'og:description', content: 'Verbessere dein Profil dauerhaft indem du mit Skillpunkten durch levelUp Skills verbesserst.' });
  
    this.metaService.updateTag({ name: 'keywords', content: 'Skills, CardCore, Upgrades, Stark'});
  }

  private loadData() {
    this.isLoading = true;
    this.errorMsg = null;

    this.profileService.getUserStats(this.username).subscribe({
      next: (player) => {
        this.player = player;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = 'Spieler-Daten konnten nicht geladen werden.';
        console.error(err);
      },
    });

    this.profileService.getUserSkills(this.username).subscribe({
      next: (skills) => {
        this.skills = (skills ?? []).map((s) => ({
          ...s,
          // base_price einmalig normalisieren (fällt auf price oder 1 zurück)
          base_price: (s as any).base_price ?? s.price ?? 1,
        }));
      },
      error: (err) => {
        this.errorMsg = 'Skills konnten nicht geladen werden.';
        console.error(err);
      },
    });
  }

  trackBySkill = (_: number, s: Skill) => s.name || s.id;

  // 💰 Preisberechnung: Basis + aktuelles Level  (→ +1 je Upgrade)
  nextPrice(skill: Skill): number {
    const base = (skill as any).base_price ?? skill.price ?? 1;
    return base + skill.skill_level;
  }

  // 🔹 Skill upgraden
  upgrade(skill: Skill) {
    if (!this.username) return;

    const atMax =
      typeof skill.max_level === 'number' &&
      skill.skill_level >= skill.max_level;
    if (atMax) return;

    if (this.busy.has(skill.name)) return; // Doppel-Click Schutz

    const cost = this.nextPrice(skill);
    if (this.player.skillPoints < cost) return;

    // ✅ Optimistisches UI
    this.busy.add(skill.name);
    this.player.skillPoints -= cost;
    skill.skill_level += 1;

    this.profileService.upgradeSkill(this.username, skill.name).subscribe({
      next: (res: any) => {
        // Server ist Quelle der Wahrheit
        if (typeof res?.newSkillLevel === 'number') {
          skill.skill_level = res.newSkillLevel;
        }
        if (typeof res?.skillPoints === 'number') {
          this.player.skillPoints = res.skillPoints;
        }
        if (typeof res?.scoreMultiplier === 'number') {
          this.player.scoreMultiplier = res.scoreMultiplier;
        }
        if (typeof res?.monetaryMultiplier === 'number') {
          this.player.monetaryMultiplier = res.monetaryMultiplier;
        }
        if (typeof res?.streakNeeded === 'number') {
          this.player.streakNeeded = res.streakNeeded;
        }
      },
      error: (err) => {
        console.error('Upgrade fehlgeschlagen:', err);
        // 🔁 Rollback exakt
        skill.skill_level -= 1;
        this.player.skillPoints += cost;
        this.errorMsg = err?.error?.message || 'Upgrade fehlgeschlagen.';
      },
      complete: () => {
        this.busy.delete(skill.name);
      },
    });
  }

  canUpgrade(skill: Skill): boolean {
    const atMax =
      typeof skill.max_level === 'number' &&
      skill.skill_level >= skill.max_level;
    return (
      !atMax &&
      !this.busy.has(skill.name) &&
      this.player.skillPoints >= this.nextPrice(skill)
    );
  }

  buttonLabel(skill: Skill): string {
    const atMax =
      typeof skill.max_level === 'number' &&
      skill.skill_level >= skill.max_level;
    return atMax ? 'Max' : this.busy.has(skill.name) ? '…' : 'Upgrade';
  }
}
