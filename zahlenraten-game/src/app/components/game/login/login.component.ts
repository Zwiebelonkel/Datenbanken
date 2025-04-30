import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // für *ngIf, *ngFor, date
import { AuthService } from '../../../services/auth.service'; // Import AuthService
import { Router } from '@angular/router'; // Import Router
import { FormsModule } from '@angular/forms';   // für ngModel

@Component({
    selector: 'app-login',
    standalone: true, // <- falls du sie standalone nutzen willst
    templateUrl: './login.component.html',
    imports: [CommonModule, FormsModule], // <-- das hier ist entscheidend!
  })
  export class LoginComponent {
    username = '';
    password = '';
    error = false;
  
    constructor(private authService: AuthService, private router: Router) {}
  
    login() {
      if (this.authService.login(this.username, this.password)) {
        this.router.navigate(['/game']);
      } else {
        this.error = true;
      }
    }
  }
  
