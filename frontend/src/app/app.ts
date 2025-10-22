import { Component, signal, OnInit, OnDestroy, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { HealthService, SystemStatus } from './core/services/health.service';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { MobileAuthNavComponent } from './shared/components/navbar/mobile-auth-nav.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, HttpClientModule, MobileAuthNavComponent, ToastContainerComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('Plumino');
  authDrawerOpen = signal(false);

  systemStatus = signal<SystemStatus>({
    backend: false,
    database: false,
    lastChecked: new Date(),
    message: 'Connecting...'
  });

  statusClass = computed(() => {
    const status = this.systemStatus();
    const result = status.backend && status.database ? 'online' :
                   status.backend ? 'partial' : 'offline';
    console.log('Status class calculated:', result, 'Backend:', status.backend, 'Database:', status.database);
    return result;
  });

  private healthSubscription?: Subscription;

  constructor(
    private healthService: HealthService,
    private authService: AuthService = inject(AuthService),
    private notificationService: NotificationService = inject(NotificationService)
  ) {}

  ngOnInit() {
    console.log('App component initializing...');

    // SSE connection is now handled automatically by AuthService auth state effect
    // No need to manually connect here

    this.healthSubscription = this.healthService.status$.subscribe(
      status => {
        console.log('Received status update in app component:', status);
        this.systemStatus.set(status);
      }
    );
  }

  ngOnDestroy() {
    if (this.healthSubscription) {
      this.healthSubscription.unsubscribe();
    }
  }

  toggleAuthDrawer(): void {
    this.authDrawerOpen.update(isOpen => {
      const newState = !isOpen;
      this.updateBodyScroll(newState);
      return newState;
    });
  }

  closeAuthDrawer(): void {
    this.authDrawerOpen.set(false);
    this.updateBodyScroll(false);
  }

  private updateBodyScroll(drawerOpen: boolean): void {
    if (typeof document !== 'undefined') {
      if (drawerOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  get statusIcon(): string {
    switch (this.statusClass()) {
      case 'online': return '🟢';
      case 'partial': return '🟡';
      case 'offline': return '🔴';
      default: return '⚫';
    }
  }


}
