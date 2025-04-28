import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { RouterModule } from '@angular/router';  // RouterModule importieren

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot([])  // Hier RouterModule mit deinen Routen konfigurieren
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
