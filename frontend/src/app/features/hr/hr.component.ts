import { CommonModule, TitleCasePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { CreateEmployeeRequest, Employee, EmployeeService } from '../../services/employee.service';

@Component({
  selector: 'app-hr',
  standalone: true,
  imports: [CommonModule, TitleCasePipe, ReactiveFormsModule],
  templateUrl: './hr.component.html',
  styleUrls: ['./hr.component.css']
})
export class HrComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // Role configuration for UI grouping (HR can see HR section but not edit it, cannot see admin)
  protected readonly roleSegments = [
    {
      role: 'hr' as Employee['role'],
      label: 'HR Team',
      description: 'People management, onboarding, and compliance.'
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

  protected readonly isLoading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly employees = signal<Employee[]>([]);

  // Additional signals for POV functionality
  protected readonly mutationError = signal<string | null>(null);
  protected readonly selectedEmployee = signal<Employee | null>(null);
  protected readonly isEmployeeDetailsModalOpen = signal(false);
  protected readonly editingEmployee = signal<string | null>(null);
  protected readonly editingSaving = signal(false);
  protected readonly isModalOpen = signal(false);
  protected readonly isSaving = signal(false);

  // Forms
  protected readonly addEmployeeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['operator' as Employee['role'], Validators.required],
    department: ['', Validators.required],
    title: ['', [Validators.maxLength(100)]],
    supervisorId: ['']
  });

  protected readonly editEmployeeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    role: ['operator' as Employee['role'], Validators.required],
    department: ['', Validators.required],
    title: ['', [Validators.maxLength(100)]],
    supervisorId: ['']
  });

  // Dashboard stats for POV section (HR view - excludes admin employees)
  protected readonly dashboardStats = computed(() => {
    const roster = this.employees().filter(employee => employee.role !== 'admin');
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

  // Group employees by role for dashboard display (excluding HR role)
  protected readonly groupedEmployees = computed(() =>
    this.roleSegments.map(segment => ({
      ...segment,
      employees: this.employees().filter(employee => employee.role === segment.role)
    }))
  );

  constructor() {
    effect(
      () => {
        const employee = this.authService.employee();
        if (employee?.role === 'hr') {
          this.loadEmployees();
        }
      },
      { allowSignalWrites: true }
    );
  }

  protected reload(): void {
    this.loadEmployees();
  }

  // Check if HR can edit this employee (HR cannot edit HR or admin employees)
  protected canEditEmployee(employee: Employee): boolean {
    return employee.role !== 'hr' && employee.role !== 'admin';
  }

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
    if (!this.canEditEmployee(employee)) return;

    this.editingEmployee.set(employee._id);
    this.mutationError.set(null);

    this.editEmployeeForm.patchValue({
      name: employee.name,
      email: employee.email,
      role: employee.role,
      department: employee.department || '',
      title: employee.title || '',
      supervisorId: typeof employee.supervisorId === 'object' && employee.supervisorId ? employee.supervisorId._id : (employee.supervisorId as string) || ''
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
    if (!this.canEditEmployee(employee) || !this.editEmployeeForm.valid) return;

    this.editingSaving.set(true);
    this.mutationError.set(null);

    const formValue = this.editEmployeeForm.value;
    const updateData = {
      name: formValue.name!,
      email: formValue.email!,
      role: formValue.role!,
      department: formValue.department!,
      title: formValue.title || undefined,
      supervisorId: formValue.supervisorId || null
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

  // Get available supervisors for dropdown selection
  protected getAvailableSupervisors(): Employee[] {
    const employees = this.employees();

    const supervisors = employees.filter(emp =>
      emp.role === 'supervisor' &&
      (emp.isActive ?? true)
    );

    return supervisors;
  }

  // Generate hierarchical display text for who an employee reports to
  protected getSupervisorDisplayText(employee: Employee): string {
    if (employee.role === 'admin') {
      return 'Reports to executive team';
    }

    if (employee.role === 'hr') {
      return 'Reports to executive team';
    }

    // Check if employee has a direct supervisor assigned
    if (employee.supervisorId) {
      if (typeof employee.supervisorId === 'object' && employee.supervisorId.name) {
        return employee.supervisorId.name;
      } else {
        // If supervisorId is just a string, find the supervisor in the employees list
        const employees = this.employees();
        const supervisor = employees.find(emp => emp._id === employee.supervisorId);
        return supervisor ? supervisor.name : 'Supervisor not found';
      }
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

  // Add Employee Modal Methods
  protected openAddEmployeeModal(): void {
    this.mutationError.set(null);
    this.isModalOpen.set(true);
    this.resetAddEmployeeForm();
  }

  protected closeAddEmployeeModal(): void {
    this.isModalOpen.set(false);
    this.resetAddEmployeeForm();
  }

  protected submitAddEmployee(): void {
    if (this.addEmployeeForm.invalid || this.isSaving()) {
      this.addEmployeeForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.mutationError.set(null);

    const formValue = this.addEmployeeForm.value;
    const newEmployee: CreateEmployeeRequest = {
      name: formValue.name!,
      email: formValue.email!,
      password: formValue.password!,
      role: formValue.role!,
      department: formValue.department!,
      title: formValue.title || undefined,
      supervisorId: formValue.supervisorId || null
    };

    this.employeeService.addEmployee(newEmployee)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSaving.set(false))
      )
      .subscribe({
        next: () => {
          this.closeAddEmployeeModal();
          this.loadEmployees(); // Refresh the list
        },
        error: (error: any) => {
          console.error('Failed to create employee', error);
          this.mutationError.set('Failed to create employee. Please try again.');
        }
      });
  }

  private resetAddEmployeeForm(): void {
    this.addEmployeeForm.reset({
      name: '',
      email: '',
      password: '',
      role: 'operator',
      department: '',
      title: '',
      supervisorId: ''
    });
    this.mutationError.set(null);
  }

  private loadEmployees(): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    this.employeeService
      .getEmployees()
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: employees => this.employees.set(Array.isArray(employees) ? employees : []),
        error: () => {
          this.loadError.set('Unable to load employee roster. Please try again.');
          this.employees.set([]);
        }
      });
  }
}
