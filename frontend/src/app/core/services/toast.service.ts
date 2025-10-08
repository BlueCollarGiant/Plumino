import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts = signal<Toast[]>([]);

  readonly toasts$ = this.toasts.asReadonly();

  show(message: string, type: Toast['type'] = 'info', duration = 5000): void {
    const id = this.generateId();
    const toast: Toast = { id, message, type, duration };

    this.toasts.update(current => [...current, toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  showRoleUpdate(message: string): void {
    this.show(message, 'info', 8000); // Longer duration for role updates
  }

  remove(id: string): void {
    this.toasts.update(current => current.filter(toast => toast.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}
