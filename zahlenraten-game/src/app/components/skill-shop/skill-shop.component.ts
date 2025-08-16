import { Component, OnInit } from '@angular/core';
import { ProfileService, Skill, UserStats } from '../../services/profile.service';
import { AuthService } from '../../services/auth.service'
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skill-shop',
  templateUrl: './skill-shop.component.html',
  styleUrls: ['./skill-shop.component.scss']
})
export class SkillShopComponent implements OnInit {
  username: string = '';
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
    scoreMultiplier: 1.0,  // Multiplikator für Score
    monetaryMultiplier: 1.0,  // Multiplikator für Money
  };

  constructor(private profileService: ProfileService, private authService: AuthService) {}

  ngOnInit() {
    this.username = this.authService.getUsername() ?? '';

    // Benutzerstatistiken (inkl. Skill-Punkte und Multiplikatoren) laden
    this.profileService.getUserStats(this.username).subscribe((player) => {
      this.player = player;
    });

    // Skills des Benutzers laden
    this.profileService.getUserSkills(this.username).subscribe((skills) => {
      this.skills = skills;
    });
  }

  // Skill upgraden
  upgrade(skill: Skill) {
    if (this.player.skillPoints >= skill.price) {
      this.profileService.upgradeSkill('username123', skill.name, skill.price, skill.skill_level).subscribe((response) => {
        // Skill-Level im Frontend aktualisieren
        skill.skill_level += 1;
        this.player.skillPoints -= skill.price; // Skill-Punkte im Frontend reduzieren
        alert(response.message);
      });
    } else {
      alert('Nicht genügend Skillpunkte oder bereits gekauft!');
    }
  }
}
