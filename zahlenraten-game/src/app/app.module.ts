
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { GameComponent } from './components/game/game.component';
import { routes } from './app.routes';
import { RegisterComponent } from './components/game/register/register.component';
import { LoginComponent } from './components/game/login/login.component';
import { VillageComponent } from './components/village/village.component';
import { AdminPageComponent } from './components/admin/admin-page/admin-page.component';
import { AchievementsComponent } from './components/achievements/achievements.component';
import { ProfileComponent } from './components/profile/profile.component';
import { HowToPlayComponent } from './components/how-to-play/how-to-play.component';
import { ClickerComponent } from './components/clicker/clicker.component';
import { DarkModeService } from './services/dark.service';
import { CardShopComponent } from './components/card-shop/card-shop.component';
import { PackOpeningComponent } from './components/pack-opening/pack-opening.component';
import { LoaderComponent } from './components/loader/loader.component';
import { RainComponent } from './components/rain/rain.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { TopbarComponent } from './components/topbar/topbar.component';
import { UserScoreHistoryComponent } from './components/user-score-history/user-score-history.component';
import { ChatComponent } from './components/chat/chat.component';
import { UsersComponent } from './components/users/users.component';
import { SlotMaschineComponent } from './components/slot-maschine/slot-maschine.component';
import { ReelComponent } from './components/slot-maschine/reel/reel.component';
import { SkillShopComponent } from './components/skill-shop/skill-shop.component';
import { PlayerBarComponent } from './components/player-bar/player-bar.component';
import { TutorialComponent } from './components/tutorial/tutorial.component';
import { PrivateChatComponent } from './components/private-chat/private-chat.component';


// import { StreakIndicator } from './components/streak-indicator/streak-indicator.component';

import { FooterComponent } from './components/footer/footer.component';
import { DatenschutzComponent } from './components/datenschutz/datenschutz.component';
import { ImpressumComponent } from './components/impressum/impressum.component';
import { ConsentService } from './services/consent.service';
import { ConsentDialogComponent } from './components/consent-dialog/consent-dialog.component';
import { AuthInterceptor } from './auth.interceptor';
import { OfflineComponent } from './components/offline/offline.component';

@NgModule({
  declarations: [
    RegisterComponent,
    LoginComponent,
    AppComponent,
    GameComponent,
    AdminPageComponent,
    AchievementsComponent,
    ProfileComponent,
    HowToPlayComponent,
    ClickerComponent,
    DarkModeService,
    CardShopComponent,
    SkillShopComponent,
    PackOpeningComponent,
    LoaderComponent,
    RainComponent,
    SidebarComponent,
    TopbarComponent,
    VillageComponent,
    ChatComponent,
    UsersComponent,
    SlotMaschineComponent,
    ReelComponent,
    PlayerBarComponent,
    UserScoreHistoryComponent,
    TutorialComponent,
    PrivateChatComponent,
    // StreakIndicatorComponent,
    DatenschutzComponent,
    ImpressumComponent,
    OfflineComponent,
    FooterComponent,
    ConsentDialogComponent,
    ConsentService,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    CommonModule,
    FormsModule,
    RouterModule.forRoot(routes),
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
