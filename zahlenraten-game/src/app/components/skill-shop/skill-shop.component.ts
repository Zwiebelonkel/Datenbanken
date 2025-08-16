import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService, Skill, UserStats } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-skill-shop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skill-shop.component.html',
  styleUrls: ['./skill-shop.component.scss'],
})
export class SkillShopComponent implements OnInit {
  username = '';
  isLoading = false;
  errorMsg: string | null = null;

  skills: Skill[] = [];

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
  };

  constructor(
    private profileService: ProfileService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.username = this.authService.getUsername() ?? '';
    if (!this.username) {
      this.errorMsg = 'Bitte einloggen, um den Skill-Shop zu benutzen.';
      return;
    }

    this.loadData();
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
      next: (skills) => (this.skills = skills ?? []),
      error: (err) => {
        this.errorMsg = 'Skills konnten nicht geladen werden.';
        console.error(err);
      },
    });
  }

  trackBySkill = (_: number, s: Skill) => s.name || s.id;

  // Skill upgraden (Skillpunkte als Währung)
  upgrade(skill: Skill) {
    if (!this.username) return;

    const notEnough = this.player.skillPoints < skill.price;
    const atMax = typeof skill.max_level === 'number' && skill.skill_level >= skill.max_level;
    if (notEnough || atMax) return;

    // Optimistisch im UI updaten
    this.player.skillPoints -= skill.price;
    skill.skill_level += 1;

    this.profileService
      // ⚠️ Nutze HIER deinen echten Service-Call; ich lasse deine Signatur,
      // ersetze aber das harte 'username123' durch this.username:
      .upgradeSkill(this.username, skill.name, skill.price, skill.skill_level - 1)
      .subscribe({
        next: (res: any) => {
          // Falls Backend neue Werte schickt, sauber übernehmen:
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
        },
        error: (err) => {
          // Rollback bei Fehler
          console.error('Upgrade fehlgeschlagen:', err);
          skill.skill_level -= 1;
          this.player.skillPoints += skill.price;
          this.errorMsg = err?.error?.message || 'Upgrade fehlgeschlagen.';
        },
      });
  }

  canUpgrade(skill: Skill): boolean {
    const atMax = typeof skill.max_level === 'number' && skill.skill_level >= skill.max_level;
    return !atMax && this.player.skillPoints >= skill.price;
  }

  buttonLabel(skill: Skill): string {
    const atMax = typeof skill.max_level === 'number' && skill.skill_level >= skill.max_level;
    return atMax ? 'Max' : 'Upgrade';
  }
}