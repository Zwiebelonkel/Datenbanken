import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { AppComponent } from './app.component';
import { GameComponent } from './components/game/game.component';
import { routes } from './app.routes';
import { RegisterComponent } from './components/game/register/register.component';
import { LoginComponent } from './components/game/login/login.component';
import { AdminPageComponent } from './components/admin/admin-page/admin-page.component';
import { AchievementsComponent } from './components/achievements/achievements.component';
import { ProfileComponent } from './components/profile/profile.component';
import { HowToPlayComponent } from './components/how-to-play/how-to-play.component';
import { ClickerComponent } from './components/clicker/clicker.component';
import { DarkModeService } from './services/dark.service';
import { CardShopComponent } from './components/card-shop/card-shop.component';
import { PackOpeningComponent } from './components/pack-opening/pack-opening.component';
import { LoaderComponent } from './components/loader/loader.component';


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
    PackOpeningComponent,
    LoaderComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    CommonModule,
    FormsModule,
    RouterModule.forRoot(routes)
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
