
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrivateChatService } from '../../services/private-chat.service';
import { AuthService } from '../../services/auth.service';
import { LoaderComponent } from '../loader/loader.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-private-chat',
  templateUrl: './private-chat.component.html',
  styleUrls: ['./private-chat.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, TopbarComponent, SidebarComponent]
})
export class PrivateChatComponent implements OnInit {

  users: any[] = [];
  selectedUser: any;
  messages: any[] = [];
  newMessage: string = '';
  username: string | null = null;
  isLoading: boolean = false;
  public showChat = false;

  constructor(private privateChatService: PrivateChatService, private authService: AuthService) { }

  ngOnInit(): void {
    this.username = this.authService.getUsername();
    this.isLoading = true;
    this.privateChatService.getUsers().subscribe(users => {
      this.users = users.filter((u: any) => u.username !== this.username);
      this.isLoading = false;
    });
  }

  selectUser(user: any) {
    this.selectedUser = user;
    this.showChat = true;
    this.messages = [];
    if (this.username) {
        this.isLoading = true;
        this.privateChatService.getMessages(this.username, this.selectedUser.username).subscribe(messages => {
          this.messages = messages || [];
          this.isLoading = false;
        });
    }
  }

  backToUserList() {
    this.showChat = false;
    this.selectedUser = null;
  }

  sendMessage() {
    if (this.newMessage.trim() === '' || !this.selectedUser) {
      return;
    }

    if (this.username) {
        const message = {
          sender: this.username,
          receiver: this.selectedUser.username,
          message: this.newMessage,
          created_at: new Date()
        };

        this.privateChatService.sendMessage(message).subscribe(() => {
          this.messages.push(message);
          this.newMessage = '';
        });
    }
  }

  trackByMsg(index: number, msg: any): any {
    return msg.created_at; 
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      // Optional: show a notification that text was copied.
    });
  }
}
