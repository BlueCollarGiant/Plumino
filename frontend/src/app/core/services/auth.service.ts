import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal, effect, Injector } from '@angular/core';
import { map, tap } from 'rxjs';
import { environment } from '../config/environment';

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface EmployeeProfile {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly department: string;
}

export interface LoginResponse {
  readonly token: string;
  readonly employee: EmployeeProfile;
}

interface AuthState {
  readonly token: string | null;
  readonly employee: EmployeeProfile | null;
}

const AUTH_STORAGE_KEY = 'plumino.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly authState = signal<AuthState>({ token: null, employee: null });
  private readonly apiBaseUrl = environment.apiBaseUrl;

  readonly token = computed(() => this.authState().token);
  readonly employee = computed(() => this.authState().employee);
  readonly isAuthenticated = computed(() => !!this.authState().token && !!this.authState().employee);

  constructor() {
    this.restoreSession();

    // Set up auth state effect for SSE management
    effect(() => {
      const isAuth = this.isAuthenticated();
      // Use injector to avoid circular dependency issues
      if (isAuth) {
        this.connectNotifications();
      } else {
        this.disconnectNotifications();
      }
    });
  }

  private async connectNotifications(): Promise<void> {
    try {
      const { NotificationService } = await import('./notification.service');
      const notificationService = this.injector.get(NotificationService);
      notificationService.connect();
    } catch (error) {
      console.warn('Failed to connect notifications:', error);
    }
  }

  private async disconnectNotifications(): Promise<void> {
    try {
      const { NotificationService } = await import('./notification.service');
      const notificationService = this.injector.get(NotificationService);
      notificationService.disconnect();
    } catch (error) {
      console.warn('Failed to disconnect notifications:', error);
    }
  }

  login(credentials: LoginRequest) {
    return this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, credentials).pipe(
      tap(response => {
        this.persistSession(response);
        // SSE connection will be handled automatically by the auth state effect

        // Force page refresh to ensure clean state with new permissions
        setTimeout(() => {
          window.location.reload();
        }, 100); // Small delay to ensure session is persisted first
      }),
      map(response => response.employee)
    );
  }

  logout(): void {
    // Call backend logout endpoint first if we have a token
    const currentAuth = this.authState();
    if (currentAuth?.token) {
      this.http.post(`${this.apiBaseUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${currentAuth.token}` }
      }).subscribe({
        next: () => console.log('✅ Backend logout successful'),
        error: (error) => console.warn('Backend logout failed:', error)
      });
    }

    // SSE disconnection will be handled automatically by the auth state effect
    this.clearSession();
  }

  private persistSession(response: LoginResponse): void {
    this.authState.set({ token: response.token, employee: response.employee });
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response));
    } catch (error) {
      console.warn('Failed to persist auth session:', error);
    }
  }

  private restoreSession(): void {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed: LoginResponse = JSON.parse(raw);
      if (parsed?.token && parsed?.employee) {
        this.authState.set({ token: parsed.token, employee: parsed.employee });
      }
    } catch (error) {
      console.warn('Failed to restore auth session:', error);
      this.clearSession();
    }
  }

  private clearSession(): void {
    this.authState.set({ token: null, employee: null });
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear auth session:', error);
    }
  }
}
