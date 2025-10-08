import { Injectable, inject, signal, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { Router } from '@angular/router';

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

  private eventSource: EventSource | null = null;
  private readonly isConnected = signal(false);

  readonly connected = this.isConnected.asReadonly();

  connect(): void {
    if (this.eventSource || !this.authService.isAuthenticated()) {
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
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://localhost:5000/api/sse/notifications', true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.setRequestHeader('Cache-Control', 'no-cache');

    let buffer = '';

    xhr.onprogress = () => {
      const newData = xhr.responseText.substring(buffer.length);
      buffer = xhr.responseText;

      this.processSSEData(newData);
    };

    xhr.onload = () => {
      this.ngZone.run(() => {
        this.isConnected.set(false);
        console.log('SSE connection closed');
      });
    };

    xhr.onerror = () => {
      this.ngZone.run(() => {
        console.error('SSE connection error');
        this.isConnected.set(false);
        // Auto-reconnect after delay
        setTimeout(() => this.connect(), 5000);
      });
    };

    xhr.send();
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
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
      this.isConnected.set(false);
    }
  }

  private handleRoleChange(notification: SSENotification): void {
    // Show persistent toast notification
    this.toastService.show(notification.message, 'info', 0); // 0 = persistent

    // Add logout button to the notification
    this.showLogoutPrompt('Your role has been updated!');
  }

  private handleDepartmentChange(notification: SSENotification): void {
    // Show persistent toast notification
    this.toastService.show(notification.message, 'info', 0); // 0 = persistent

    // Add logout button to the notification
    this.showLogoutPrompt('Your department has been changed!');
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
    // Create a custom notification with logout button
    setTimeout(() => {
      const userWantsToLogout = confirm(
        `${title}\n\nWould you like to log out now to apply your changes?\n\nClick OK to log out now, or Cancel to continue working.`
      );

      if (userWantsToLogout) {
        this.authService.logout();
        this.router.navigate(['/']);
      }
    }, 2000); // Show after the toast has been visible for a moment
  }
}
