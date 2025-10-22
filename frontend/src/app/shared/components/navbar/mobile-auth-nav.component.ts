import { CommonModule } from '@angular/common';
import { Component, computed, signal, inject, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';
import { DemoLoginComponent } from '../demo-login/demo-login.component';

@Component({
  selector: 'app-mobile-auth-nav',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DemoLoginComponent],
  templateUrl: './mobile-auth-nav.component.html',
  styleUrls: ['./mobile-auth-nav.component.css']
})
export class MobileAuthNavComponent {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly auth = this.authService;
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly employeeName = computed(() => this.auth.employee()?.name ?? '');
  protected readonly employeeRole = computed(() => this.auth.employee()?.role ?? '');
  protected readonly employeeDepartment = computed(() => this.auth.employee()?.department ?? '');
  protected readonly isAdmin = computed(() => this.auth.employee()?.role === 'admin');
  protected readonly isHr = computed(() => this.auth.employee()?.role === 'hr');

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.errorMessage()) {
        this.errorMessage.set(null);
      }
    });
  }

  protected submit(): void {
    if (this.loading()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const credentials: LoginRequest = this.form.getRawValue();
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(credentials).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.loading.set(false);
        this.form.reset();
      },
      error: (error: unknown) => {
        this.loading.set(false);
        const message =
          this.extractErrorMessage(error) ?? 'Unable to login. Please try again.';
        this.errorMessage.set(message);
      }
    });
  }

  protected logout(): void {
    this.authService.logout();
    this.form.reset();
    this.errorMessage.set(null);
    this.showPassword.set(false);
  }

  protected togglePassword(): void {
    this.showPassword.update(current => !current);
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
