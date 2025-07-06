import { Routes } from '@angular/router';
import { GameComponent } from './components/game/game.component';
import { LoginComponent } from './components/game/login/login.component';
import { RegisterComponent } from './components/game/register/register.component';
import { AdminPageComponent } from './components/admin/admin-page/admin-page.component';
import { AchievementsComponent } from './components/achievements/achievements.component';

export const routes: Routes = [
  { path: '', component: GameComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'game', component: GameComponent },
  { path: 'admin', component: AdminPageComponent },
  { path: 'achievements', component: AchievementsComponent },
];
