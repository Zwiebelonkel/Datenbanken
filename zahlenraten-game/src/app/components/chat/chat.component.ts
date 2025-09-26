import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Subscription, interval, Subject, switchMap, takeUntil } from 'rxjs';
import { LoaderComponent } from '../loader/loader.component';

interface ChatMessage {
  username: string;
  message: string;
  created_at: string;
}

@Component({
  selector: 'app-global-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent],
})
export class ChatComponent implements OnInit, OnDestroy {
  messages: ChatMessage[] = [];
  newMessage = '';
  username = '';
  isExpanded = true;
  isLoading = true;

  @ViewChild('messageContainer') messageContainer!: ElementRef;

  private pollingSub: Subscription | null = null;
  private destroy$ = new Subject<void>();

  constructor(private chatService: ChatService, private auth: AuthService) {}

  ngOnInit() {
    this.username = this.auth.getUsername() || 'Gast';
    const saved = localStorage.getItem('globalChatExpanded');
    if (saved === '1') {
      this.isExpanded = true;
      this.openAndStart();
    }
  }

  ngOnDestroy() {
    this.stopPolling();
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    localStorage.setItem('globalChatExpanded', this.isExpanded ? '1' : '0');
    if (this.isExpanded) {
      this.openAndStart();
    } else {
      this.stopPolling();
    }
  }

  private openAndStart() {
    this.isLoading = true;
    this.loadMessages(); // kein Scroll hier
    this.startPolling();

    // ⏳ Warte, bis die Transition abgeschlossen ist
    setTimeout(() => {
      this.scrollToBottom();
    }, 450); // etwas mehr als 400ms Transition
  }

  private startPolling() {
    this.stopPolling(); // safety
    this.pollingSub = interval(5000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.chatService.getLatestMessages(20))
      )
      .subscribe({
        next: (data) => {
          this.messages = data;
          // Kein Auto-Scroll hier, sonst springt's beim Lesen
        },
        error: (err) => console.error('Chat-Polling Fehler:', err),
      });
  }

  private stopPolling() {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
  }

  loadMessages(scrollToBottom: boolean = false) {
    if (!this.isExpanded) return;

    this.chatService.getLatestMessages(20).subscribe({
      next: (data) => {
        this.messages = data;
        this.isLoading = false;
      },
      error: (err) =>
        console.error('Fehler beim Laden der Chat-Nachrichten:', err),
    });
  }

  scrollToBottom() {
    if (!this.messageContainer) return;
    const el = this.messageContainer.nativeElement as HTMLElement;
    el.scrollTop = el.scrollHeight;
  }

  sendMessage() {
    if (!this.isExpanded) return; // nur senden, wenn offen
    const text = this.newMessage.trim();
    if (!text) return;

    // Optimistic UI
    const temp: ChatMessage = {
      username: this.username,
      message: text,
      created_at: new Date().toISOString(),
    };
    this.messages = [...this.messages, temp];
    this.scrollToBottom();
    this.newMessage = '';

    this.chatService
      .sendMessage({ username: this.username, message: text })
      .subscribe({
        next: () => this.loadMessages(), // echte Liste nachziehen
        error: (err) => console.error('Senden fehlgeschlagen:', err),
      });
  }

  trackByMsg(index: number, msg: ChatMessage) {
    // Falls die API IDs liefert, hier stattdessen id nehmen
    return msg.created_at + '_' + index;
  }

  // Optional: Profil besuchen (später implementieren)
  visitProfile(username: string) {}

  copyToClipboard(text: string) {
    if (!text) return;

    navigator.clipboard.writeText(text).then(
      () => {
        console.log('Text kopiert:', text);
        // Optional: kurze visuelle Rückmeldung
      },
      (err) => {
        console.error('Kopieren fehlgeschlagen:', err);
      }
    );
  }
}
