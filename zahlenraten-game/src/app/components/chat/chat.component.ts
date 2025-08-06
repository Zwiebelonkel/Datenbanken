import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

interface ChatMessage {
  username: string;
  message: string;
  created_at: string;
}

@Component({
  selector: 'app-global-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class ChatComponent implements OnInit {
  messages: ChatMessage[] = [];
  newMessage = '';
  username = 'Gpt'; // Optional: aus AuthService holen
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadMessages();
    setInterval(() => this.loadMessages(), 5000);
  }

  loadMessages() {
    this.http.get<ChatMessage[]>('/api/chat/latest').subscribe(data => {
      this.messages = data;
    });
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;

    const msg = this.newMessage;
    this.newMessage = '';
    this.http.post('/api/chat/send', {
      username: this.username,
      message: msg
    }).subscribe(() => {
      this.loadMessages();
    });
  }
}
