import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrivateChatService } from '../../services/private-chat.service';
import { AuthService } from '../../services/auth.service';
import { LoaderComponent } from '../loader/loader.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { LevelsService, LevelUser } from '../../services/levels.service';
import { Title, Meta } from '@angular/platform-browser';


@Component({
  selector: 'app-private-chat',
  templateUrl: './private-chat.component.html',
  styleUrls: ['./private-chat.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, TopbarComponent, SidebarComponent]
})
export class PrivateChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  users: LevelUser[] = [];
  selectedUser: LevelUser | null = null;
  messages: any[] = [];
  newMessage: string = '';
  username: string | null = null;
  isLoading: boolean = false;
  public showChat = false;
  private profilePictureCache = new Map<string, string | null>();
  public unreadMessages: { [username: string]: boolean } = {};
  private pollingInterval: any;

  constructor(
    private privateChatService: PrivateChatService, 
    private authService: AuthService,
    private levelsService: LevelsService,
    private titleService: Title,
    private metaService: Meta
  ) {}

  ngOnInit(): void {
    this.setSeoTags();
    this.username = this.authService.getUsername();
    this.isLoading = true;
    this.levelsService.load(1, 1000).subscribe(response => {
      response.users.forEach(user => {
        this.profilePictureCache.set(user.username, user.profileImageUrl ?? null);
      });
      this.users = response.users.filter((u) => u.username !== this.username);
      this.users.forEach(user => {
        if (this.username) {
          this.checkForUnreadMessages(user.username);
        }
      });
      this.isLoading = false;
      this.startPolling();
    });
  }

  setSeoTags(): void {
    this.titleService.setTitle('PrivatChat - CardCore');
  
    this.metaService.updateTag({ name: 'description', content: 'Schreibe hier privat mit anderen Spielern von CardCore.' });
  
    this.metaService.updateTag({ property: 'og:title', content: 'PrivatChat - CardCore' });
  
    this.metaService.updateTag({ property: 'og:description', content: 'Schreibe hier privat mit anderen Spielern von CardCore.' });
  
    this.metaService.updateTag({ name: 'keywords', content: 'Chat, CardCore, Messanger, Sozial'});
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  startPolling(): void {
    this.pollingInterval = setInterval(() => {
      if (this.showChat && this.selectedUser && this.username) {
        this.privateChatService.getMessages(this.username, this.selectedUser.username).subscribe(messages => {
          if (messages && messages.length > this.messages.length) {
            this.messages = messages;
            setTimeout(() => this.scrollToBottom(), 0);
          }
        });
      } else {
        this.users.forEach(user => {
          if (this.username) {
            this.checkForUnreadMessages(user.username);
          }
        });
      }
    }, 3000); // Poll every 3 seconds
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  checkForUnreadMessages(otherUser: string) {
    if (!this.username || (this.selectedUser && this.selectedUser.username === otherUser)) {
        if(otherUser) this.unreadMessages[otherUser] = false;
        return;
    }
    this.privateChatService.getMessages(this.username, otherUser).subscribe(messages => {
      if (messages && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const lastReadTimestamp = this.getLastReadTimestamp(otherUser);
        if (!lastReadTimestamp || new Date(lastMessage.created_at) > new Date(lastReadTimestamp)) {
          this.unreadMessages[otherUser] = true;
        } else {
          this.unreadMessages[otherUser] = false;
        }
      }
    });
  }

  getLastReadTimestamp(username: string): string | null {
    if(!this.username) return null;
    return localStorage.getItem(`lastRead_${this.username}_${username}`);
  }

  setLastReadTimestamp(username: string) {
    if(this.username) {
      localStorage.setItem(`lastRead_${this.username}_${username}`, new Date().toISOString());
      this.unreadMessages[username] = false;
    }
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
          this.setLastReadTimestamp(user.username);
          setTimeout(() => this.scrollToBottom(), 0);
        });
    }
  }

  backToUserList() {
    this.showChat = false;
    this.selectedUser = null;
    this.users.forEach(user => {
      if (this.username) {
        this.checkForUnreadMessages(user.username);
      }
    });
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
          if(this.selectedUser) this.setLastReadTimestamp(this.selectedUser.username)
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
