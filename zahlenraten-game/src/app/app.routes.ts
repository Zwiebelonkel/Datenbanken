import { Routes } from '@angular/router';
import { GameComponent } from './components/game/game.component';
import { LoginComponent } from './components/game/login/login.component';
import { RegisterComponent } from './components/game/register/register.component';
import { AdminPageComponent } from './components/admin/admin-page/admin-page.component';
import { AchievementsComponent } from './components/achievements/achievements.component';
import { ProfileComponent } from './components/profile/profile.component';
import { HowToPlayComponent } from './components/how-to-play/how-to-play.component';
import { ClickerComponent } from './components/clicker/clicker.component';
import { CardShopComponent } from './components/card-shop/card-shop.component';
import { PackOpeningComponent } from './components/pack-opening/pack-opening.component';

export const routes: Routes = [
  { path: '', component: GameComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'game', component: GameComponent },
  { path: 'admin', component: AdminPageComponent },
  { path: 'achievements', component: AchievementsComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'how-to-play', component: HowToPlayComponent },
  { path: 'clicker', component: ClickerComponent },
  { path: 'card-shop', component: CardShopComponent },
  { path: 'pack-opening', component: PackOpeningComponent },

];
