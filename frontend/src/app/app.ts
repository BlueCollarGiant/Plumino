import { Component, signal, OnInit, OnDestroy, computed } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { HealthService, SystemStatus } from './core/services/health.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, HttpClientModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  protected readonly title = signal('Plumino');

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

  constructor(private healthService: HealthService) {}

  ngOnInit() {
    console.log('App component initializing...');
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

  get statusIcon(): string {
    switch (this.statusClass()) {
      case 'online': return '🟢';
      case 'partial': return '🟡';
      case 'offline': return '🔴';
      default: return '⚫';
    }
  }


}
