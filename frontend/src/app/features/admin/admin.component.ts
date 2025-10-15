// Imports
import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { CreateEmployeeRequest, Employee, EmployeeService } from '../../services/employee.service';



@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TitleCasePipe],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent {
  // Signals & State
  private readonly fb = inject(FormBuilder);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Role configuration for UI grouping
  protected readonly roleSegments = [
    {
      role: 'admin' as Employee['role'],
      label: 'Admin Team',
      description: 'Platform governance and configuration oversight.'
    },
    {
      role: 'hr' as Employee['role'],
      label: 'HR Team',
      description: 'Talent management, onboarding, and compliance.'
    },
    {
      role: 'supervisor' as Employee['role'],
      label: 'Supervisors',
      description: 'Shift leadership and production quality assurance.'
    },
    {
      role: 'operator' as Employee['role'],
      label: 'Operators',
      description: 'Daily execution and line monitoring responsibilities.'
    }
  ] as const;

  // Authentication & Authorization State
  protected readonly currentEmployee = computed(() => this.authService.employee());
  protected readonly isAdmin = computed(() => this.currentEmployee()?.role === 'admin');

  // Employee Data State
  protected readonly employees = signal<Employee[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly mutationError = signal<string | null>(null);
  protected readonly removeInFlight = signal<string | null>(null);

  // Modal & UI State
  protected readonly isModalOpen = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly editingEmployee = signal<string | null>(null);
  protected readonly editingSaving = signal(false);
  protected readonly selectedEmployee = signal<Employee | null>(null);
  protected readonly isEmployeeDetailsModalOpen = signal(false);

  // Forms
  protected readonly addEmployeeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['operator' as Employee['role'], Validators.required],
    department: ['', Validators.required]
  });

  protected readonly editEmployeeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['operator' as Employee['role'], Validators.required],
    department: ['', Validators.required]
  });

  // Helpers / Computed Logic
  // Extract unique departments from employee list for form dropdown
  protected readonly departmentOptions = computed(() => {
    const departments = new Set(
      this.employees()
        .map(employee => employee.department)
        .filter((department): department is string => !!department)
    );

    return Array.from(departments).sort((a, b) => a.localeCompare(b));
  });

  // Calculate dashboard statistics from employee data
  protected readonly dashboardStats = computed(() => {
    const roster = this.employees();
    const active = roster.filter(employee => employee.isActive ?? true).length;
    const departments = new Set(roster.map(employee => employee.department).filter(Boolean)).size;
    const hrCount = roster.filter(employee => employee.role === 'hr').length;

    return {
      total: roster.length,
      active,
      departments,
      hrCount
    };
  });

  // Group employees by role for dashboard display
  protected readonly groupedEmployees = computed(() =>
    this.roleSegments.map(segment => ({
      ...segment,
      employees: this.employees().filter(employee => employee.role === segment.role)
    }))
  );

  // Lifecycle / Init Logic
  // Initialize component and enforce admin-only access
  private readonly bootstrapEffect = effect(
    () => {
      if (!this.isAdmin()) {
        this.router.navigate(['/']);
        return;
      }

      this.loadEmployees();
    },
    { allowSignalWrites: true }
  );

  // Core Methods
  // Reload employee data from server
  protected reloadEmployees(): void {
    this.loadEmployees();
  }

  // Event Handlers / UI Actions
  // Open employee details modal with selected employee
  protected openEmployeeDetailsModal(employee: Employee): void {
    this.selectedEmployee.set(employee);
    this.isEmployeeDetailsModalOpen.set(true);
    this.mutationError.set(null);
  }

  // Close employee details modal and cleanup state
  protected closeEmployeeDetailsModal(): void {
    this.isEmployeeDetailsModalOpen.set(false);
    this.selectedEmployee.set(null);
    this.cancelEditingEmployee();
  }

  // Check if specific employee is currently being edited
  protected isEmployeeEditing(employeeId: string): boolean {
    return this.editingEmployee() === employeeId;
  }

  // Start editing employee - populate form with current data
  protected startEditingEmployee(employee: Employee): void {
    if (!this.isAdmin()) return;

    this.editingEmployee.set(employee._id);
    this.mutationError.set(null);

    this.editEmployeeForm.patchValue({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department || ''
    });
  }

  // Cancel employee editing and reset form
  protected cancelEditingEmployee(): void {
    this.editingEmployee.set(null);
    this.editEmployeeForm.reset();
    this.mutationError.set(null);
  }

  // Save changes to employee data
  protected saveEmployeeChanges(employee: Employee): void {
    if (!this.isAdmin() || !this.editEmployeeForm.valid) return;

    this.editingSaving.set(true);
    this.mutationError.set(null);

    const formValue = this.editEmployeeForm.value;
    const updateData = {
      name: formValue.name!,
      email: formValue.email!,
      role: formValue.role!,
      department: formValue.department!
    };

    this.employeeService.updateEmployee(employee._id, updateData)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.editingSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.editingEmployee.set(null);
          this.closeEmployeeDetailsModal();
          this.loadEmployees(); // Refresh the list
        },
        error: (error: any) => {
          console.error('Failed to update employee', error);
          this.mutationError.set('Failed to update employee. Please try again.');
        }
      });
  }

  // Helpers / Computed Logic
  // Get supervisors available for a specific employee based on department
  protected getSupervisorsForEmployee(employee: Employee): Employee[] {
    const employees = this.employees();

    const supervisors = employees.filter(emp =>
      emp.role === 'supervisor' &&
      emp.department === employee.department &&
      emp._id !== employee._id &&
      (emp.isActive ?? true)
    );

    return supervisors;
  }

  // Get all active HR personnel
  protected getAllHRPeople(): Employee[] {
    const employees = this.employees();

    const hrPeople = employees.filter(emp =>
      emp.role === 'hr' &&
      (emp.isActive ?? true)
    );

    return hrPeople;
  }

  // Generate hierarchical display text for who an employee reports to
  protected getSupervisorDisplayText(employee: Employee): string {
    if (employee.role === 'admin') {
      return 'Reports to executive team';
    }

    if (employee.role === 'hr') {
      return 'Reports to executive team';
    }

    if (employee.role === 'supervisor') {
      const hrPeople = this.getAllHRPeople();

      if (hrPeople.length === 0) {
        return 'Reports to executive team';
      } else if (hrPeople.length === 1) {
        return hrPeople[0].name;
      } else {
        return hrPeople.map(hr => hr.name).join(', ');
      }
    }

    const supervisors = this.getSupervisorsForEmployee(employee);

    if (supervisors.length === 0) {
      return 'No supervisor assigned';
    } else if (supervisors.length === 1) {
      return supervisors[0].name;
    } else {
      return supervisors.map(s => s.name).join(', ');
    }
  }

  // Event Handlers / UI Actions (continued)
  // Open add employee modal
  protected openAddEmployeeModal(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.mutationError.set(null);
    this.isModalOpen.set(true);
    this.resetAddEmployeeForm();
  }

  // Close add employee modal
  protected closeAddEmployeeModal(): void {
    this.isModalOpen.set(false);
    this.resetAddEmployeeForm();
  }

  // Submit new employee form
  protected submitAddEmployee(): void {
    if (!this.isAdmin()) {
      return;
    }

    if (this.addEmployeeForm.invalid || this.isSaving()) {
      this.addEmployeeForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.mutationError.set(null);

    const payload = this.addEmployeeForm.getRawValue() as CreateEmployeeRequest;

    this.employeeService
      .addEmployee(payload)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: () => {
          this.closeAddEmployeeModal();
          this.loadEmployees();
        },
        error: error => {
          console.error('Failed to create employee', error);
          this.mutationError.set('Failed to add employee. Please review the form and try again.');
        }
      });
  }

  // Confirm and execute employee deactivation or removal
  protected confirmDeactivateEmployee(employee: Employee): void {
    if (!this.isAdmin()) {
      return;
    }

    const prompt = (employee.isActive ?? true)
      ? `Deactivate ${employee.name}? This will temporarily revoke access.`
      : `Remove ${employee.name}? This will permanently delete their account.`;

    if (!confirm(prompt)) {
      return;
    }

    this.removeInFlight.set(employee._id);
    this.mutationError.set(null);

    const mode: 'delete' | 'deactivate' = (employee.isActive ?? true) ? 'deactivate' : 'delete';

    this.employeeService
      .removeEmployee(employee._id, mode)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.removeInFlight.set(null)))
      .subscribe({
        next: () => {
          this.closeEmployeeDetailsModal();
          this.loadEmployees();
        },
        error: error => {
          console.error('Failed to update employee status', error);
          this.mutationError.set(`Unable to update ${employee.name}. Please retry.`);
        }
      });
  }

  // External Service Calls
  // Fetch employee data from API
  private loadEmployees(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.employeeService
      .getEmployees()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: employees => this.employees.set(Array.isArray(employees) ? employees : []),
        error: error => {
          console.error('Failed to load employees', error);
          this.loadError.set('Unable to load employees. Please try again.');
          this.employees.set([]);
        }
      });
  }

  // Helpers / Computed Logic (continued)
  // Reset add employee form to default state
  private resetAddEmployeeForm(): void {
    this.addEmployeeForm.reset({
      name: '',
      email: '',
      password: '',
      role: 'operator',
      department: ''
    });

    this.addEmployeeForm.markAsPristine();
    this.addEmployeeForm.markAsUntouched();
  }
}
