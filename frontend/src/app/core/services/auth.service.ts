import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { map, tap } from 'rxjs';

export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

export interface EmployeeProfile {
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
  private readonly authState = signal<AuthState>({ token: null, employee: null });

  readonly token = computed(() => this.authState().token);
  readonly employee = computed(() => this.authState().employee);
  readonly isAuthenticated = computed(() => !!this.authState().token && !!this.authState().employee);

  constructor() {
    this.restoreSession();
  }

  login(credentials: LoginRequest) {
    return this.http.post<LoginResponse>('http://localhost:5000/api/auth/login', credentials).pipe(
      tap(response => this.persistSession(response)),
      map(response => response.employee)
    );
  }

  logout(): void {
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
