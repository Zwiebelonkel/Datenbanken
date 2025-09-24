
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';

@Injectable({
  providedIn: 'root'
})
export class PrivateChatService {

  private socket;
  private apiUrl = 'https://outside-between.onrender.com/api';

  constructor(private http: HttpClient) {
    this.socket = io('https://outside-between.onrender.com');
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  getMessages(user1: string, user2: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/messages/${user1}/${user2}`);
  }

  sendMessage(message: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/messages`, message);
  }

  onNewMessage(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('chat message', (msg) => {
        observer.next(msg);
      });
    });
  }
}
