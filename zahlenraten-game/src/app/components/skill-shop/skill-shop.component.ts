import { Component, OnInit } from '@angular/core';
import { ProfileService, Skill, Player } from '../../services/profile.service';

@Component({
  selector: 'app-skill-shop',
  templateUrl: './skill-shop.component.html',
  styleUrls: ['./skill-shop.component.scss']
})
export class SkillShopComponent implements OnInit {
  skills: Skill[] = [];
  player: Player = {
    skillPoints: 0,
    scoreMultiplier: 1.0,
    monetaryMultiplier: 1.0,
  };

  constructor(private profileService: ProfileService) {}

  ngOnInit() {
    const username = 'username123'; // Dynamisch setzen

    // Benutzerstatistiken (inkl. Skill-Punkte) laden
    this.profileService.getUserStats(username).subscribe((player) => {
      this.player = player;
    });

    // Skills des Benutzers laden
    this.profileService.getUserSkills(username).subscribe((skills) => {
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
