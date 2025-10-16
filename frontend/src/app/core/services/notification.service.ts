import { Injectable, inject, signal, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { Router } from '@angular/router';
import { environment } from '../config/environment';

export interface SSENotification {
  message: string;
  changes?: any;
  timestamp: string;
  countdown?: number;
  forceLogout?: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly ngZone = inject(NgZone);
  private readonly notificationsUrl = environment.sseUrl;

  private eventSource: EventSource | null = null;
  private xhr: XMLHttpRequest | null = null;
  private readonly isConnected = signal(false);

  readonly connected = this.isConnected.asReadonly();

  connect(): void {
    if (this.xhr || !this.authService.isAuthenticated()) {
      return;
    }

    const token = this.authService.token();
    if (!token) return;

    try {
      // Create SSE connection with authentication header
      // Note: EventSource doesn't support custom headers, so we'll use a custom approach
      this.createAuthenticatedEventSource(token);
    } catch (error) {
      console.error('Failed to establish SSE connection:', error);
    }
  }

  private createAuthenticatedEventSource(token: string): void {
    // Since EventSource doesn't support custom headers, we need to create our own
    this.xhr = new XMLHttpRequest();
    this.xhr.open('GET', this.notificationsUrl, true);
    this.xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    this.xhr.setRequestHeader('Accept', 'text/event-stream');
    this.xhr.setRequestHeader('Cache-Control', 'no-cache');

    let buffer = '';

    this.xhr.onprogress = () => {
      if (!this.xhr) return;
      const newData = this.xhr.responseText.substring(buffer.length);
      buffer = this.xhr.responseText;

      this.processSSEData(newData);
    };

    this.xhr.onload = () => {
      this.ngZone.run(() => {
        this.isConnected.set(false);
        console.log('SSE connection closed');
      });
    };

    this.xhr.onerror = () => {
      this.ngZone.run(() => {
        console.error('SSE connection error');
        this.isConnected.set(false);
        // Auto-reconnect after delay
        setTimeout(() => this.connect(), 5000);
      });
    };

    this.xhr.send();
    this.isConnected.set(true);
  }

  private processSSEData(data: string): void {
    const lines = data.split('\n');
    let eventType = '';
    let eventData = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        eventData = line.substring(5).trim();
      } else if (line === '' && eventType && eventData) {
        // Process complete event
        this.ngZone.run(() => {
          this.handleSSEEvent(eventType, eventData);
        });
        eventType = '';
        eventData = '';
      }
    }
  }

  private handleSSEEvent(eventType: string, data: string): void {
    try {
      const parsed = JSON.parse(data);

      switch (eventType) {
        case 'connected':
          console.log('✅ SSE connected:', parsed.message);
          break;
        case 'roleChange':
          this.handleRoleChange(parsed);
          break;
        case 'departmentChange':
          this.handleDepartmentChange(parsed);
          break;
        case 'forceLogout':
          this.handleForceLogoutWarning(parsed);
          break;
        case 'sessionExpired':
          this.handleSessionExpired(parsed);
          break;
        case 'heartbeat':
          // Keep connection alive - no action needed
          break;
      }
    } catch (error) {
      console.error('Failed to parse SSE event:', error);
    }
  }

  disconnect(): void {
    if (this.xhr) {
      this.xhr.abort();
      this.xhr = null;
      this.isConnected.set(false);
      console.log('SSE connection disconnected');
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected.set(false);
    }
  }

  private handleRoleChange(notification: SSENotification): void {
    console.log('🔄 Role change detected:', notification);

    // Show informational notification
    this.toastService.show(notification.message, 'info', 0); // persistent so they don't miss it

    // Give them a gentle prompt to logout when ready
    this.showLogoutPrompt('Your role has been updated! You can continue working, but please log out and back in when convenient to apply your new permissions.');
  }

  private handleDepartmentChange(notification: SSENotification): void {
    console.log('🏢 Department change detected:', notification);

    // Show informational notification
    this.toastService.show(notification.message, 'info', 0); // persistent so they don't miss it

    // Give them a gentle prompt to logout when ready
    this.showLogoutPrompt('Your department has been changed! You can continue working, but please log out and back in when convenient to apply your new permissions.');
  }

  private handleForceLogoutWarning(notification: SSENotification): void {
    console.log('⚠️ Force logout warning received:', notification);

    // Show urgent warning toast
    this.toastService.show(notification.message, 'warning', 0); // persistent warning

    // Show countdown alert
    if (notification.countdown) {
      let timeLeft = notification.countdown;
      const countdownInterval = setInterval(() => {
        if (timeLeft > 0) {
          console.log(`🔒 Automatic logout in ${timeLeft} seconds`);
          timeLeft--;
        } else {
          clearInterval(countdownInterval);
        }
      }, 1000);
    }
  }

  private handleSessionExpired(notification: SSENotification): void {
    console.log('🔒 Session expired, forcing logout:', notification);

    // Show final notification
    this.toastService.show(notification.message, 'error', 0);

    // Force logout
    if (notification.forceLogout) {
      this.authService.logout();
    }
  }

  private showLogoutPrompt(title: string): void {
    // Create a friendly notification with logout option
    setTimeout(() => {
      const userWantsToLogout = confirm(
        `${title}\n\nWould you like to log out now to get your updated permissions?\n\nClick OK to log out now, or Cancel to continue working and log out later.`
      );

      if (userWantsToLogout) {
        this.authService.logout();
        this.router.navigate(['/']);
      } else {
        // User chose to continue working - show a reminder toast
        this.toastService.show(
          'Remember to log out and back in when you\'re ready to apply your permission changes.',
          'info',
          10000 // 10 second reminder
        );
      }
    }, 2000); // Show after the toast has been visible for a moment
  }
}
