import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private apiUrl = 'https://outside-between.onrender.com/api/chat'; // API-URL für den Chat-Service

  constructor(private http: HttpClient) {}

  // Nachricht senden
  sendMessage(data: { username: string; message: string }) {
    return this.http.post(`${this.apiUrl}/send`, data);
  }

  // Die letzten Nachrichten abrufen
  getLatestMessages(limit = 50) {
    return this.http.get(`${this.apiUrl}/latest`, {
      params: { limit: limit.toString() }
    });
  }
}
