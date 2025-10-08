import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

export interface Employee {
  readonly _id: string;
  readonly name: string;
  readonly email: string;
  readonly department: string;
  readonly role: 'admin' | 'hr' | 'supervisor' | 'operator';
  readonly isActive?: boolean;
}

export interface CreateEmployeeRequest {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly role: Employee['role'];
  readonly department: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5000/api/employees';

  // Centralized API access for Admin dashboard employee management.
  getEmployees(): Observable<Employee[]> {
    return this.http.get<Employee[]>(this.baseUrl).pipe(
      catchError(error => {
        console.error('Failed to load employees', error);
        return throwError(() => error);
      })
    );
  }

  // Creates a new employee record from the admin modal form.
  addEmployee(payload: CreateEmployeeRequest): Observable<Employee> {
    return this.http.post<Employee>(this.baseUrl, payload).pipe(
      catchError(error => {
        console.error('Failed to create employee', error);
        return throwError(() => error);
      })
    );
  }

  // Deactivates or removes an employee by id, supporting both DELETE and PATCH routes.
  removeEmployee(employeeId: string, mode: 'delete' | 'deactivate' = 'delete'): Observable<void> {
    if (mode === 'deactivate') {
      return this.http.patch<void>(`${this.baseUrl}/${employeeId}/deactivate`, {}).pipe(
        catchError(error => {
          console.error('Failed to deactivate employee', error);
          return throwError(() => error);
        })
      );
    }

    return this.http.delete<void>(`${this.baseUrl}/${employeeId}`).pipe(
      catchError(error => {
        console.error('Failed to delete employee', error);
        return throwError(() => error);
      })
    );
  }
}

