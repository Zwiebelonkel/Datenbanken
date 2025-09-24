
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io } from 'socket.io-client';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class PrivateChatService {

  private socket;
  private apiUrl = 'https://outside-between.onrender.com/api';

  constructor(private http: HttpClient, private authService: AuthService) {
    const token = this.authService.getToken();
    this.socket = io('https://outside-between.onrender.com', {
      auth: {
        token: token
      }
    });
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders().set('Authorization', `Bearer ${token}`);
  }

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`, { headers: this.getHeaders() });
  }

  getMessages(user1: string, user2: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/messages/${user1}/${user2}`, { headers: this.getHeaders() });
  }

  sendMessage(message: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/messages`, message, { headers: this.getHeaders() });
  }

  onNewMessage(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('chat message', (msg) => {
        observer.next(msg);
      });
    });
  }
}
