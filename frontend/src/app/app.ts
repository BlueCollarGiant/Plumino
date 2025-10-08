import { Component, signal, OnInit, OnDestroy, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { HealthService, SystemStatus } from './core/services/health.service';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { MobileAuthNavComponent } from './shared/components/navbar/mobile-auth-nav.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, HttpClientModule, MobileAuthNavComponent, ToastContainerComponent],
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

    // Initialize SSE notifications if user is authenticated
    if (this.authService.isAuthenticated()) {
      console.log('User is authenticated, connecting to SSE...');
      this.notificationService.connect();
    }

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
    this.authDrawerOpen.update(isOpen => !isOpen);
  }

  closeAuthDrawer(): void {
    this.authDrawerOpen.set(false);
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
