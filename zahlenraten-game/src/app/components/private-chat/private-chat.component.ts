import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrivateChatService } from '../../services/private-chat.service';
import { AuthService } from '../../services/auth.service';
import { LoaderComponent } from '../loader/loader.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { LevelsService, LevelUser } from '../../services/levels.service';

@Component({
  selector: 'app-private-chat',
  templateUrl: './private-chat.component.html',
  styleUrls: ['./private-chat.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, TopbarComponent, SidebarComponent]
})
export class PrivateChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  users: LevelUser[] = [];
  selectedUser: LevelUser | null = null;
  messages: any[] = [];
  newMessage: string = '';
  username: string | null = null;
  isLoading: boolean = false;
  public showChat = false;
  private profilePictureCache = new Map<string, string | null>();

  constructor(
    private privateChatService: PrivateChatService, 
    private authService: AuthService,
    private levelsService: LevelsService
  ) { }

  ngOnInit(): void {
    this.username = this.authService.getUsername();
    this.isLoading = true;
    // Load all users to build the cache, then filter for display.
    this.levelsService.load(1, 1000).subscribe(response => {
      response.users.forEach(user => {
        this.profilePictureCache.set(user.username, user.profileImageUrl ?? null);
      });
      this.users = response.users.filter((u) => u.username !== this.username);
      this.isLoading = false;
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  avatar(url?: string | null, size = 40): string {
    if (!url) return 'assets/profile.png';
    return url.replace(
      '/upload/',
      `/upload/w_${size},h_${size},c_fill,g_auto,f_auto,q_auto/`
    );
  }

  onAvatarError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'assets/profile.png';
  }

  getAvatar(username: string): string {
    const imageUrl = this.profilePictureCache.get(username);
    return this.avatar(imageUrl);
  }

  scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  selectUser(user: LevelUser) {
    this.selectedUser = user;
    this.showChat = true;
    this.messages = [];
    if (this.username) {
        this.isLoading = true;
        this.privateChatService.getMessages(this.username, this.selectedUser.username).subscribe(messages => {
          this.messages = messages || [];
          this.isLoading = false;
          setTimeout(() => this.scrollToBottom(), 0);
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
          setTimeout(() => this.scrollToBottom(), 0);
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
