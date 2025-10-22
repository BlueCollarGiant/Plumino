import { Component, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';
import { DEMO_MODE } from '../../../core/config/demo.config';

interface DemoEmployee {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly role: string;
  readonly department: string;
  readonly title: string;
}

@Component({
  selector: 'app-demo-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './demo-login.component.html',
  styleUrls: ['./demo-login.component.css']
})
export class DemoLoginComponent {
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isDemoMode = DEMO_MODE;
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  /**
   * Employee seed data from backend/employees.js
   * This data mirrors the seed file for demo login purposes
   * Ordered by role hierarchy: admin > hr > supervisors > operators
   */
  protected readonly demoEmployees: readonly DemoEmployee[] = [
    // Admin
    {
      name: "John Admin",
      email: "admin@plumino.com",
      password: "admin123",
      role: "admin",
      department: "office",
      title: "System Administrator"
    },
    // HR
    {
      name: "Sarah HR Manager",
      email: "hr@plumino.com",
      password: "hr123",
      role: "hr",
      department: "office",
      title: "HR Manager"
    },
    // Supervisors
    {
      name: "Jane Supervisor",
      email: "supervisor@plumino.com",
      password: "supervisor123",
      role: "supervisor",
      department: "fermentation",
      title: "Fermentation Supervisor"
    },
    {
      name: "Mike Johnson",
      email: "mike@plumino.com",
      password: "mike123",
      role: "supervisor",
      department: "extraction",
      title: "Extraction Supervisor"
    },
    {
      name: "Emma Packaging Supervisor",
      email: "emma@plumino.com",
      password: "emma123",
      role: "supervisor",
      department: "packaging",
      title: "Packaging Supervisor"
    },
    // Operators
    {
      name: "Bob Operator",
      email: "operator@plumino.com",
      password: "operator123",
      role: "operator",
      department: "extraction",
      title: "Extraction Operator"
    },
    {
      name: "Alice Smith",
      email: "alice@plumino.com",
      password: "alice123",
      role: "operator",
      department: "packaging",
      title: "Packaging Operator"
    },
    {
      name: "Tom Fermentation Worker",
      email: "tom@plumino.com",
      password: "tom123",
      role: "operator",
      department: "fermentation",
      title: "Fermentation Technician"
    }
  ];

  /**
   * Log in as a demo employee
   * @param employee The demo employee to log in as
   */
  protected loginAsDemo(employee: DemoEmployee): void {
    if (this.loading()) {
      return;
    }

    const credentials: LoginRequest = {
      email: employee.email,
      password: employee.password
    };

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(credentials)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          // AuthService handles the redirect via window.location.reload()
        },
        error: (error: unknown) => {
          this.loading.set(false);
          const message = this.extractErrorMessage(error) ??
            `Failed to login as ${employee.role}. Please try again.`;
          this.errorMessage.set(message);
        }
      });
  }

  /**
   * Capitalize the first letter of a string
   */
  protected capitalize(value: string): string {
    if (!value) return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  private extractErrorMessage(error: unknown): string | null {
    if (!error) {
      return null;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (typeof error === 'object') {
      const maybeError = error as { error?: unknown; message?: unknown };

      if (maybeError.error && typeof maybeError.error === 'object') {
        const inner = maybeError.error as { message?: unknown; error?: unknown };
        if (typeof inner.message === 'string') {
          return inner.message;
        }
        if (typeof inner.error === 'string') {
          return inner.error;
        }
      }

      if (typeof maybeError.message === 'string') {
        return maybeError.message;
      }
    }

    return null;
  }
}
