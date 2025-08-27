import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-offline',
  standalone: true,
  imports: [CommonModule, TopbarComponent],
  templateUrl: './offline.component.html',
  styleUrls: ['./offline.component.scss'],
})
export class OfflineComponent {}
