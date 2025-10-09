import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toasts(); track toast.id) {
        <div
          class="toast"
          [class.toast-success]="toast.type === 'success'"
          [class.toast-info]="toast.type === 'info'"
          [class.toast-warning]="toast.type === 'warning'"
          [class.toast-error]="toast.type === 'error'"
        >
          <div class="toast-content">
            <span class="toast-message">{{ toast.message }}</span>
            <button
              class="toast-close"
              (click)="closeToast(toast.id)"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
    }

    .toast {
      margin-bottom: 12px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      animation: slideIn 0.3s ease-out;
      border-left: 4px solid;
    }

    .toast-info {
      background: rgba(59, 130, 246, 0.95);
      border-left-color: #3b82f6;
      color: white;
    }

    .toast-success {
      background: rgba(34, 197, 94, 0.95);
      border-left-color: #22c55e;
      color: white;
    }

    .toast-warning {
      background: rgba(245, 158, 11, 0.95);
      border-left-color: #f59e0b;
      color: white;
    }

    .toast-error {
      background: rgba(239, 68, 68, 0.95);
      border-left-color: #ef4444;
      color: white;
    }

    .toast-content {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .toast-message {
      flex: 1;
      line-height: 1.5;
      font-size: 14px;
    }

    .toast-close {
      background: none;
      border: none;
      color: inherit;
      font-size: 18px;
      font-weight: bold;
      cursor: pointer;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .toast-close:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `]
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);

  protected readonly toasts = this.toastService.toasts$;

  protected closeToast(id: string): void {
    this.toastService.remove(id);
  }
}
