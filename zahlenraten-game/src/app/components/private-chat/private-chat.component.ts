
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrivateChatService } from '../../services/private-chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-private-chat',
  templateUrl: './private-chat.component.html',
  styleUrls: ['./private-chat.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class PrivateChatComponent implements OnInit {

  users: any[] = [];
  selectedUser: any;
  messages: any[] = [];
  newMessage: string = '';

  constructor(private privateChatService: PrivateChatService, private authService: AuthService) { }

  ngOnInit(): void {
    this.privateChatService.getUsers().subscribe(users => {
      this.users = users;
    });
  }

  selectUser(user: any) {
    this.selectedUser = user;
    const username = this.authService.getUsername();
    if (username) {
        this.privateChatService.getMessages(username, this.selectedUser.username).subscribe(messages => {
          this.messages = messages || [];
        });
    }
  }

  sendMessage() {
    if (this.newMessage.trim() === '' || !this.selectedUser) {
      return;
    }

    const username = this.authService.getUsername();
    if (username) {
        const message = {
          sender: username,
          receiver: this.selectedUser.username,
          message: this.newMessage
        };

        this.privateChatService.sendMessage(message).subscribe(() => {
          this.messages.push(message);
          this.newMessage = '';
        });
    }
  }
}
