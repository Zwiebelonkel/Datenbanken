import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { ViewChild, ElementRef } from '@angular/core';

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
  imports: [CommonModule, FormsModule],
})
export class ChatComponent implements OnInit {
  messages: ChatMessage[] = [];
  newMessage = '';
  username = '';
  loading = false;
  showAll = false;
  @ViewChild('messageContainer') messageContainer!: ElementRef;

  constructor(private chatService: ChatService, private auth: AuthService) {}

  ngOnInit() {
    this.username = this.auth.getUsername() || 'Unbekannt';
    this.loadMessages(true);
    setInterval(() => this.loadMessages(), 50000000000000000000000000000);
  }

  loadMessages(scrollToBottom: boolean = false) {
    this.chatService.getLatestMessages(20).subscribe((data) => {
      this.messages = data;
      if (scrollToBottom) {
        setTimeout(() => this.scrollToBottom(), 100);
      }
    });
  }

  toggleShowAll() {
    this.showAll = !this.showAll;
    this.loadMessages();
  }

  scrollToBottom() {
    const el = this.messageContainer.nativeElement;
    el.scrollTop = el.scrollHeight;
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const msg = this.newMessage;
    this.newMessage = '';
    this.chatService
      .sendMessage({ username: this.username, message: msg })
      .subscribe(() => {
        this.loadMessages();
      });
    this.scrollToBottom();
  }
}
