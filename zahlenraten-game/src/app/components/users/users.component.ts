  levelUsers: LevelUser[] = [];
  isLevelListOpen = false;
  loadingLevels = false;

  avatar(url?: string | null, size = 32): string {
    if (!url) return 'assets/profile.png';
    return url.replace(
      '/upload/',
      `/upload/w_${size},h_${size},c_fill,g_auto,f_auto,q_auto/`
    );
  }

  onAvatarError(ev: Event) {
    (ev.target as HTMLImageElement).src = 'assets/profile.png';
  }

  trackByUsername(i: number, item: any) {
    return item?.username ?? i;
  }

toggleLevelList() {
  this.isLevelListOpen = !this.isLevelListOpen;

  // Erst laden, wenn geöffnet und Daten noch nicht da
  if (this.isLevelListOpen && this.levelUsers.length === 0) {
    this.loadingLevels = true;
    this.levelsService.load().subscribe({
      next: (users) => {
        this.levelUsers = users;
        this.loadingLevels = false;
      },
      error: (err) => {
        console.error("❌ Fehler beim Laden der Level-Liste:", err);
        this.loadingLevels = false;
      }
    });
  }
}
