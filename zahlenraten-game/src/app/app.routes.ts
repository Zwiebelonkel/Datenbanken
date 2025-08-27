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
import { SkillShopComponent } from './components/skill-shop/skill-shop.component';
import { PackOpeningComponent } from './components/pack-opening/pack-opening.component';
import { VillageComponent } from './components/village/village.component';
import { SlotMaschineComponent } from './components/slot-maschine/slot-maschine.component';
import { ImpressumComponent } from './components/impressum/impressum.component';
import { DatenschutzComponent } from './components/datenschutz/datenschutz.component';
import { AboutComponent } from './components/about/about.component';
import { ContactComponent } from './components/contact/contact.component';
import { PackOpeningPageComponent } from './components/pack-opening.page/pack-opening.page';

export const routes: Routes = [
  { path: '', component: GameComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'game', component: GameComponent },
  { path: 'admin', component: AdminPageComponent },
  { path: 'achievements', component: AchievementsComponent },
  { path: 'profile/:username', component: ProfileComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'how-to-play', component: HowToPlayComponent },
  { path: 'clicker', component: ClickerComponent },
  { path: 'card-shop', component: CardShopComponent },
  { path: 'skill-shop', component: SkillShopComponent },
  // { path: 'pack-opening', component: PackOpeningComponent },
  { path: 'village', component: VillageComponent },
  { path: 'slot-maschine', component: SlotMaschineComponent },
  { path: 'impressum', component: ImpressumComponent },
  { path: 'datenschutz', component: DatenschutzComponent },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  // app.routes.ts
  {
    path: 'pack-opening',
    loadComponent: () =>
      import('./components/pack-opening.page/pack-opening.page').then(
        (m) => m.PackOpeningPageComponent
      ),
  },
];
