import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  username: string;
  message: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = 'https://outside-between.onrender.com/api/chat';

  constructor(private http: HttpClient) {}

  // Nachricht senden
  sendMessage(data: { username: string; message: string }) {
    return this.http.post(`${this.apiUrl}/send`, data);
  }

  // Die letzten Nachrichten abrufen
  getLatestMessages(limit = 5): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/latest?limit=${limit}`);
  }
}
