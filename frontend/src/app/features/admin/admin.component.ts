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
  template: `
    <div class="admin-dashboard">
      <div class="background-container">
        <div class="floating-shapes">
          <div class="shape shape-1"></div>
          <div class="shape shape-2"></div>
          <div class="shape shape-3"></div>
          <div class="shape shape-4"></div>
          <div class="shape shape-5"></div>
        </div>
        <div class="gradient-overlay"></div>
      </div>

      <header class="dashboard-header">
        <div class="header-content">
          <div class="title-section">
            <div class="icon-wrapper">
              <div class="dashboard-icon">ADM</div>
              <div class="icon-glow"></div>
            </div>
            <div class="title-text">
              <h1>Admin Dashboard</h1>
              <p>System administration and user management</p>
            </div>
          </div>
        </div>
      </header>

      <section class="pov" [class.modal-open]="isModalOpen()">
        <div class="dashboard-toolbar">
          <div class="toolbar-content">
            <span class="toolbar-eyebrow">Access Control</span>
            <h2 class="toolbar-title">Team Overview</h2>
            <p class="toolbar-description">
              Monitor organization-wide access and manage employee lifecycle across every role.
            </p>
          </div>
          @if (isAdmin()) {
            <button
              type="button"
              class="btn-primary add-button"
              (click)="openAddEmployeeModal()"
            >
              <span class="btn-icon">+</span>
              Add Employee
            </button>
          }
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">EMP</div>
                <div class="stat-icon-glow users-glow"></div>
              </div>
              <span class="stat-label">Total Employees</span>
            </div>
            <div class="stat-value">{{ dashboardStats().total }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">ACT</div>
                <div class="stat-icon-glow active-glow"></div>
              </div>
              <span class="stat-label">Active Users</span>
            </div>
            <div class="stat-value">{{ dashboardStats().active }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">DEPT</div>
                <div class="stat-icon-glow departments-glow"></div>
              </div>
              <span class="stat-label">Departments</span>
            </div>
            <div class="stat-value">{{ dashboardStats().departments }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">HR</div>
                <div class="stat-icon-glow health-glow"></div>
              </div>
              <span class="stat-label">HR Coverage</span>
            </div>
            <div class="stat-value">{{ dashboardStats().hrCount }}</div>
          </div>
        </div>

        <div class="feedback-row">
          @if (loadError()) {
            <div class="error-banner">
              <span>{{ loadError() }}</span>
              <button type="button" class="btn-secondary retry-button" (click)="reloadEmployees()">
                Retry
              </button>
            </div>
          }
          @if (mutationError()) {
            <div class="warning-banner">
              {{ mutationError() }}
            </div>
          }
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading employee roster…</p>
          </div>
        } @else {
          <div class="role-grid">
            @for (segment of groupedEmployees(); track segment.role) {
              <div
                class="role-card"
                [class.accent-admin]="segment.role === 'admin'"
                [class.accent-hr]="segment.role === 'hr'"
                [class.accent-supervisor]="segment.role === 'supervisor'"
                [class.accent-operator]="segment.role === 'operator'"
              >
                <div class="role-header">
                  <div class="role-header-text">
                    <h3>{{ segment.label }}</h3>
                    <p>{{ segment.description }}</p>
                  </div>
                  <span class="role-count">{{ segment.employees.length }}</span>
                </div>

                @if (segment.employees.length) {
                  <div class="role-body">
                    <div class="employee-list">
                      @for (employee of segment.employees; track employee._id) {
                        <div class="employee-card">
                          <div class="employee-main-row" (click)="openEmployeeDetailsModal(employee)">
                            <div class="employee-basic-info">
                              <div class="employee-name-section">
                                <span class="employee-name">{{ employee.name }}</span>
                                <span class="employee-email">{{ employee.email }}</span>
                              </div>
                            </div>
                            <div class="employee-expand-section">
                              <div class="view-icon">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/>
                                  <circle cx="8" cy="8" r="2"/>
                                </svg>
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                } @else {
                  <div class="empty-state">
                    <p>No team members assigned yet.</p>
                  </div>
                }
              </div>
            }
          </div>
        }
      </section>

      @if (isEmployeeDetailsModalOpen()) {
        <div class="modal-backdrop">
          <div class="modal-panel employee-details-modal">
            <header class="modal-header">
              <h2>Employee Details</h2>
              <p>View and manage employee information</p>
              <button type="button" class="modal-close-btn" (click)="closeEmployeeDetailsModal()">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                </svg>
              </button>
            </header>

            @if (selectedEmployee()) {
              @if (!isEmployeeEditing(selectedEmployee()!._id)) {
                <div class="employee-details-content">
                  <div class="employee-details-grid">
                    <div class="detail-section">
                      <label class="detail-label">Employee ID</label>
                      <span class="detail-value">{{ selectedEmployee()!._id }}</span>
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Full Name</label>
                      <span class="detail-value">{{ selectedEmployee()!.name }}</span>
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Email Address</label>
                      <span class="detail-value">{{ selectedEmployee()!.email }}</span>
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Department</label>
                      <span class="detail-value">{{ selectedEmployee()!.department || 'Not assigned' }}</span>
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Role</label>
                      <span class="detail-value">{{ selectedEmployee()!.role | titlecase }}</span>
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Account Status</label>
                      <span class="detail-value">{{ (selectedEmployee()!.isActive ?? true) ? 'Active' : 'Inactive' }}</span>
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Reports To</label>
                      <span class="detail-value">{{ getSupervisorDisplayText(selectedEmployee()!) }}</span>
                    </div>
                  </div>

                  <div class="employee-actions">
                    @if (isAdmin()) {
                      <button
                        type="button"
                        class="btn-primary action-btn"
                        (click)="startEditingEmployee(selectedEmployee()!)"
                      >
                        Edit Employee
                      </button>
                    }
                    <button
                      type="button"
                      class="btn-secondary action-btn"
                      [disabled]="removeInFlight() === selectedEmployee()!._id"
                      (click)="confirmDeactivateEmployee(selectedEmployee()!)"
                    >
                      @if (removeInFlight() === selectedEmployee()!._id) {
                        <span class="inline-spinner" aria-hidden="true"></span>
                      }
                      {{ (selectedEmployee()!.isActive ?? true) ? 'Deactivate Employee' : 'Remove Employee' }}
                    </button>
                  </div>
                </div>
              }

              @if (isEmployeeEditing(selectedEmployee()!._id)) {
                <form [formGroup]="editEmployeeForm" (ngSubmit)="saveEmployeeChanges(selectedEmployee()!)" class="edit-employee-form">
                  <div class="employee-details-grid">
                    <div class="detail-section">
                      <label class="detail-label">Employee ID</label>
                      <span class="detail-value readonly">{{ selectedEmployee()!._id }}</span>
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Full Name</label>
                      <input
                        type="text"
                        formControlName="name"
                        class="detail-input"
                        [class.error]="editEmployeeForm.controls.name.invalid && (editEmployeeForm.controls.name.dirty || editEmployeeForm.controls.name.touched)"
                      />
                      @if (
                        editEmployeeForm.controls.name.invalid &&
                        (editEmployeeForm.controls.name.dirty || editEmployeeForm.controls.name.touched)
                      ) {
                        <span class="error-text">Name is required</span>
                      }
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Email Address</label>
                      <input
                        type="email"
                        formControlName="email"
                        class="detail-input"
                        [class.error]="editEmployeeForm.controls.email.invalid && (editEmployeeForm.controls.email.dirty || editEmployeeForm.controls.email.touched)"
                      />
                      @if (
                        editEmployeeForm.controls.email.invalid &&
                        (editEmployeeForm.controls.email.dirty || editEmployeeForm.controls.email.touched)
                      ) {
                        <span class="error-text">Valid email is required</span>
                      }
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Department</label>
                      <select
                        formControlName="department"
                        class="detail-input"
                        [class.error]="editEmployeeForm.controls.department.invalid && (editEmployeeForm.controls.department.dirty || editEmployeeForm.controls.department.touched)"
                      >
                        <option value="">Select Department</option>
                        <option value="fermentation">Fermentation</option>
                        <option value="extraction">Extraction</option>
                        <option value="packaging">Packaging</option>
                        <option value="office">Office</option>
                      </select>
                      @if (
                        editEmployeeForm.controls.department.invalid &&
                        (editEmployeeForm.controls.department.dirty || editEmployeeForm.controls.department.touched)
                      ) {
                        <span class="error-text">Department is required</span>
                      }
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Role</label>
                      <select
                        formControlName="role"
                        class="detail-input"
                        [class.error]="editEmployeeForm.controls.role.invalid && (editEmployeeForm.controls.role.dirty || editEmployeeForm.controls.role.touched)"
                      >
                        <option value="operator">Operator</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="hr">HR</option>
                        <option value="admin">Admin</option>
                      </select>
                      @if (
                        editEmployeeForm.controls.role.invalid &&
                        (editEmployeeForm.controls.role.dirty || editEmployeeForm.controls.role.touched)
                      ) {
                        <span class="error-text">Role is required</span>
                      }
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Account Status</label>
                      <span class="detail-value readonly">{{ (selectedEmployee()!.isActive ?? true) ? 'Active' : 'Inactive' }}</span>
                    </div>
                    <div class="detail-section">
                      <label class="detail-label">Reports To</label>
                      <span class="detail-value readonly">{{ getSupervisorDisplayText(selectedEmployee()!) }}</span>
                    </div>
                  </div>

                  <div class="employee-actions">
                    <button
                      type="submit"
                      class="btn-primary action-btn"
                      [disabled]="!editEmployeeForm.valid || editingSaving()"
                    >
                      @if (editingSaving()) {
                        <span class="inline-spinner" aria-hidden="true"></span>
                      }
                      Save Changes
                    </button>
                    <button
                      type="button"
                      class="btn-secondary action-btn"
                      (click)="cancelEditingEmployee()"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              }
            }
          </div>
        </div>
      }

      @if (isModalOpen()) {
        <div class="modal-backdrop">
          <div class="modal-panel">
            <header class="modal-header">
              <h2>Add Employee</h2>
              <p>Provision a new team member and assign their access level.</p>
            </header>

            <form [formGroup]="addEmployeeForm" (ngSubmit)="submitAddEmployee()" class="modal-form">
              <label>
                <span>Name</span>
                <input type="text" formControlName="name" placeholder="Full name" />
                @if (
                  addEmployeeForm.controls.name.invalid &&
                  (addEmployeeForm.controls.name.dirty || addEmployeeForm.controls.name.touched)
                ) {
                  <span class="form-error">
                    Name is required.
                  </span>
                }
              </label>

              <label>
                <span>Email</span>
                <input type="email" formControlName="email" placeholder="name@plumino.com" />
                @if (
                  addEmployeeForm.controls.email.invalid &&
                  (addEmployeeForm.controls.email.dirty || addEmployeeForm.controls.email.touched)
                ) {
                  <span class="form-error">
                    Valid email is required.
                  </span>
                }
              </label>

              <label>
                <span>Password</span>
                <input type="password" formControlName="password" placeholder="Minimum 8 characters" />
                @if (
                  addEmployeeForm.controls.password.invalid &&
                  (addEmployeeForm.controls.password.dirty || addEmployeeForm.controls.password.touched)
                ) {
                  <span class="form-error">
                    Password must be at least 8 characters.
                  </span>
                }
              </label>

              <label>
                <span>Role</span>
                <select formControlName="role">
                  <option value="" disabled>Select role</option>
                  <option value="admin">Admin</option>
                  <option value="hr">HR</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="operator">Operator</option>
                </select>
                @if (
                  addEmployeeForm.controls.role.invalid &&
                  (addEmployeeForm.controls.role.dirty || addEmployeeForm.controls.role.touched)
                ) {
                  <span class="form-error">
                    Please assign a role.
                  </span>
                }
              </label>

              <label>
                <span>Department</span>
                @if (departmentOptions().length) {
                  <select formControlName="department">
                    <option value="" disabled>Select department</option>
                    @for (department of departmentOptions(); track department) {
                      <option [value]="department">
                        {{ department }}
                      </option>
                    }
                  </select>
                } @else {
                  <input type="text" formControlName="department" placeholder="Department name" />
                }
                @if (
                  addEmployeeForm.controls.department.invalid &&
                  (addEmployeeForm.controls.department.dirty || addEmployeeForm.controls.department.touched)
                ) {
                  <span class="form-error">
                    Department is required.
                  </span>
                }
              </label>

              <div class="modal-actions">
                <button type="button" class="btn-secondary" (click)="closeAddEmployeeModal()">
                  Cancel
                </button>
                <button type="submit" class="btn-primary" [disabled]="isSaving()">
                  @if (isSaving()) {
                    <span class="inline-spinner" aria-hidden="true"></span>
                  }
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      /* ======================================================
         Component: Admin Dashboard
         Purpose: System administration and employee management interface
         Linked TS File: admin.component.ts
         Notes: Responsive design with floating background animations
         ====================================================== */

      /* Base Layout ------------------------------------------ */
      * {
        box-sizing: border-box;
      }

      .admin-dashboard {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
        background: #0a0f1c;
        color: white;
      }

      /* Background & Animations ----------------------------- */
      .background-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -1;
      }

      .floating-shapes {
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: hidden;
      }

      .shape {
        position: absolute;
        border-radius: 50%;
        background: linear-gradient(45deg, rgba(139, 69, 19, 0.1), rgba(184, 134, 11, 0.1));
        backdrop-filter: blur(1px);
        animation: float 20s infinite linear;
      }

      .shape-1 {
        width: 300px;
        height: 300px;
        top: 10%;
        left: -150px;
        animation-delay: 0s;
        animation-duration: 25s;
      }

      .shape-2 {
        width: 200px;
        height: 200px;
        top: 60%;
        right: -100px;
        animation-delay: -8s;
        animation-duration: 30s;
      }

      .shape-3 {
        width: 150px;
        height: 150px;
        top: 30%;
        left: 80%;
        animation-delay: -15s;
        animation-duration: 22s;
      }

      .shape-4 {
        width: 250px;
        height: 250px;
        bottom: 20%;
        left: 10%;
        animation-delay: -12s;
        animation-duration: 28s;
      }

      .shape-5 {
        width: 180px;
        height: 180px;
        top: 5%;
        left: 50%;
        animation-delay: -20s;
        animation-duration: 35s;
      }

      @keyframes float {
        0% {
          transform: translateY(0) rotate(0deg);
          opacity: 0.3;
        }
        50% {
          opacity: 0.6;
        }
        100% {
          transform: translateY(-100vh) rotate(360deg);
          opacity: 0;
        }
      }

      .gradient-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background:
          radial-gradient(circle at 20% 30%, rgba(139, 69, 19, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(184, 134, 11, 0.1) 0%, transparent 50%),
          linear-gradient(135deg, #0a0f1c 0%, #1e293b 100%);
      }

      /* Header Section -------------------------------------- */
      .dashboard-header {
        padding: 2rem;
        position: relative;
        z-index: 2;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.02);
        backdrop-filter: blur(20px);
      }

      .header-content {
        max-width: 1400px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .title-section {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      .icon-wrapper {
        position: relative;
      }

      .dashboard-icon {
        font-size: 1.8rem;
        font-weight: 800;
        color: #d97706;
        position: relative;
        z-index: 1;
        letter-spacing: 1px;
      }

      .icon-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        background: radial-gradient(circle, rgba(217, 119, 6, 0.4) 0%, transparent 70%);
        border-radius: 50%;
        filter: blur(15px);
        animation: glow 3s ease-in-out infinite alternate;
      }

      @keyframes glow {
        from {
          opacity: 0.5;
          transform: translate(-50%, -50%) scale(0.8);
        }
        to {
          opacity: 0.8;
          transform: translate(-50%, -50%) scale(1.2);
        }
      }

      .title-text h1 {
        font-size: 2.5rem;
        font-weight: 800;
        margin: 0 0 0.5rem 0;
        background: linear-gradient(135deg, #ffffff 0%, #d97706 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .title-text p {
        margin: 0;
        color: #cbd5e1;
        font-size: 1.1rem;
      }

      /* Main Content Area ----------------------------------- */
      .pov {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        padding: 2rem;
        position: relative;
        z-index: 2;
        max-width: 1400px;
        margin: 0 auto;
      }

      /* Statistics Cards ------------------------------------ */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .stat-card {
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1rem;
        padding: 1.5rem;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .stat-card:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-5px);
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
      }

      .stat-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }

      .stat-icon-wrapper {
        position: relative;
      }

      .stat-icon {
        font-size: 1rem;
        font-weight: 800;
        color: white;
        padding: 0.5rem;
        border-radius: 8px;
        letter-spacing: 0.5px;
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        position: relative;
        z-index: 1;
      }

      .stat-icon-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 40px;
        height: 40px;
        border-radius: 50%;
        filter: blur(10px);
        opacity: 0.6;
      }

      .users-glow { background: radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%); }
      .active-glow { background: radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%); }
      .departments-glow { background: radial-gradient(circle, rgba(249, 115, 22, 0.4) 0%, transparent 70%); }
      .health-glow { background: radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%); }

      .stat-label {
        color: #e2e8f0;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 800;
        color: white;
        margin-top: 0.5rem;
      }

      /* Buttons & Interactions ------------------------------ */
      .btn-primary,
      .btn-secondary {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border-radius: 999px;
        border: none;
        font-size: 0.9rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        text-decoration: none;
        backdrop-filter: blur(10px);
      }

      .btn-primary {
        background: linear-gradient(135deg, #d97706, #b45309);
        color: white;
        box-shadow: 0 4px 12px rgba(217, 119, 6, 0.3);
      }

      .btn-primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #b45309, #92400e);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(217, 119, 6, 0.4);
      }

      .btn-secondary {
        background: rgba(255, 255, 255, 0.1);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .btn-secondary:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
        color: white;
        transform: translateY(-2px);
      }

      .btn-icon {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.5px;
      }

      /* Dashboard Toolbar ----------------------------------- */
      .dashboard-toolbar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 2rem;
        margin-bottom: 2rem;
      }

      .toolbar-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        max-width: 640px;
      }

      .toolbar-eyebrow {
        font-size: 0.75rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 600;
        color: #fbbf24;
      }

      .toolbar-title {
        font-size: 2.25rem;
        font-weight: 800;
        margin: 0;
      }

      .toolbar-description {
        color: #cbd5f5;
        max-width: 560px;
        line-height: 1.6;
        margin: 0;
      }

      .add-button {
        min-width: 180px;
        justify-content: center;
      }

      /* Feedback & Status Messages -------------------------- */
      .feedback-row {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .error-banner,
      .warning-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.85rem 1.25rem;
        border-radius: 12px;
        font-size: 0.95rem;
        border: 1px solid transparent;
      }

      .error-banner {
        background: rgba(248, 113, 113, 0.15);
        border-color: rgba(248, 113, 113, 0.4);
        color: #fecaca;
      }

      .warning-banner {
        background: rgba(251, 191, 36, 0.12);
        border-color: rgba(251, 191, 36, 0.35);
        color: #fde68a;
      }

      .retry-button {
        margin-left: auto;
      }

      /* Loading States -------------------------------------- */
      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        gap: 1rem;
        padding: 2.5rem;
        background: rgba(255, 255, 255, 0.04);
        border: 1px dashed rgba(255, 255, 255, 0.12);
        border-radius: 16px;
        color: #e2e8f0;
        font-size: 1rem;
      }

      .loading-spinner,
      .inline-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid rgba(255, 255, 255, 0.2);
        border-top-color: #fbbf24;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .inline-spinner {
        width: 16px;
        height: 16px;
        border-width: 2px;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      /* Employee Role Cards --------------------------------- */
      .role-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.75rem;
      }

      .role-card {
        background: rgba(15, 23, 42, 0.65);
        border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 18px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding: 1.5rem;
        transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
      }

      .role-card:hover {
        transform: translateY(-4px);
        border-color: rgba(148, 163, 184, 0.35);
        box-shadow: 0 16px 35px rgba(15, 23, 42, 0.35);
      }

      .role-card.accent-admin {
        border-color: rgba(59, 130, 246, 0.45);
        box-shadow: 0 12px 25px rgba(59, 130, 246, 0.15);
      }

      .role-card.accent-hr {
        border-color: rgba(129, 140, 248, 0.45);
        box-shadow: 0 12px 25px rgba(129, 140, 248, 0.15);
      }

      .role-card.accent-supervisor {
        border-color: rgba(248, 113, 113, 0.45);
        box-shadow: 0 12px 25px rgba(248, 113, 113, 0.15);
      }

      .role-card.accent-operator {
        border-color: rgba(45, 212, 191, 0.45);
        box-shadow: 0 12px 25px rgba(45, 212, 191, 0.15);
      }

      .role-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .role-header-text h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 700;
      }

      .role-header-text p {
        margin: 0.35rem 0 0;
        color: #94a3b8;
        font-size: 0.95rem;
      }

      .role-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 2.25rem;
        height: 2.25rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        font-weight: 700;
        font-size: 1rem;
      }

      .role-body {
        background: rgba(15, 23, 42, 0.45);
        border-radius: 14px;
        border: 1px solid rgba(148, 163, 184, 0.12);
        overflow: hidden;
      }

      /* Employee Lists -------------------------------------- */
      .employee-list {
        display: flex;
        flex-direction: column;
      }

      .employee-card {
        border-bottom: 1px solid rgba(148, 163, 184, 0.12);
        transition: all 0.3s ease;
      }

      .employee-card:last-child {
        border-bottom: none;
      }

      .employee-main-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        cursor: pointer;
        transition: all 0.15s ease;
        border-radius: 8px;
        margin: 0 0.5rem;
      }

      .employee-main-row:hover {
        background: rgba(148, 163, 184, 0.04);
        transform: translateY(-1px);
      }

      .employee-basic-info {
        display: flex;
        align-items: center;
        flex: 1;
      }

      .employee-name-section {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
      }

      .employee-name {
        font-weight: 600;
        color: #f1f5f9;
        font-size: 0.95rem;
      }

      .employee-email {
        font-size: 0.8rem;
        color: #94a3b8;
      }

      .employee-expand-section {
        display: flex;
        align-items: center;
        padding-left: 1rem;
      }

      .view-icon {
        transition: all 0.2s ease;
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 6px;
        background: transparent;
      }

      .view-icon:hover {
        background: rgba(148, 163, 184, 0.08);
        color: #334155;
      }

      .employee-main-row:hover .view-icon {
        color: #475569;
      }

      .empty-state {
        padding: 2rem 1.25rem;
        text-align: center;
        color: #94a3b8;
        font-size: 0.95rem;
      }

      /* Employee Details & Forms ---------------------------- */
      .employee-details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
        margin-bottom: 1.5rem;
      }

      .edit-employee-form .employee-details-grid {
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.75rem;
      }

      .detail-section {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
        overflow: hidden;
      }

      .detail-label {
        font-size: 0.75rem;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 500;
      }

      .detail-value {
        color: #e2e8f0;
        font-weight: 500;
      }

      .detail-value.readonly {
        opacity: 0.7;
        font-style: italic;
      }

      .detail-input {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 8px;
        padding: 0.5rem 0.75rem;
        color: #e2e8f0;
        font-size: 0.9rem;
        transition: border-color 0.2s ease;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
      }

      .detail-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }

      .detail-input.error {
        border-color: #ef4444;
      }

      .detail-input option {
        background: #1e293b;
        color: #e2e8f0;
      }

      .edit-employee-form {
        width: 100%;
      }

      .error-text {
        color: #fca5a5;
        font-size: 0.75rem;
        margin-top: 0.25rem;
        display: block;
      }

      .employee-actions {
        display: flex;
        gap: 0.75rem;
        padding-top: 1rem;
        border-top: 1px solid rgba(148, 163, 184, 0.08);
      }

      .action-btn {
        font-size: 0.85rem;
        padding: 0.5rem 1rem;
      }

      /* Modal Components ------------------------------------ */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(8, 11, 19, 0.75);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        z-index: 20;
      }

      .modal-panel {
        width: min(540px, 100%);
        background: linear-gradient(180deg, rgba(13, 17, 28, 0.95), rgba(15, 23, 42, 0.95));
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 18px;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        box-shadow: 0 24px 60px rgba(2, 6, 23, 0.45);
      }

      .employee-details-modal {
        width: min(720px, 100%);
        max-height: 90vh;
        overflow-y: auto;
      }

      .modal-header {
        position: relative;
      }

      .modal-close-btn {
        position: absolute;
        top: 0;
        right: 0;
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        padding: 0.5rem;
        border-radius: 8px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .modal-close-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #f8fafc;
      }

      .employee-details-content {
        display: flex;
        flex-direction: column;
        gap: 2rem;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
      }

      .modal-header p {
        margin: 0.5rem 0 0;
        color: #94a3b8;
      }

      .modal-form {
        display: grid;
        gap: 1.25rem;
      }

      .modal-form label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #e2e8f0;
      }

      .modal-form input,
      .modal-form select {
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        padding: 0.6rem 0.75rem;
        background: rgba(15, 23, 42, 0.85);
        color: #f8fafc;
        font-size: 0.95rem;
      }

      .modal-form input:focus,
      .modal-form select:focus {
        outline: none;
        border-color: rgba(217, 119, 6, 0.75);
        box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.25);
      }

      .form-error {
        font-size: 0.75rem;
        color: #fca5a5;
      }

      .modal-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 0.5rem;
      }

      .pov.modal-open {
        filter: blur(2px);
      }

      /* Responsive Tweaks ----------------------------------- */
      @media (max-width: 768px) {
        .header-content {
          flex-direction: column;
          gap: 1rem;
          text-align: center;
        }

        .dashboard-toolbar {
          flex-direction: column;
          align-items: flex-start;
        }

        .add-button {
          width: 100%;
        }

        .title-text h1 {
          font-size: 2rem;
        }

        .pov {
          padding: 1rem;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }

        .role-grid {
          grid-template-columns: 1fr;
        }

        .role-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .employee-details-grid {
          grid-template-columns: 1fr;
        }

        .edit-employee-form .employee-details-grid {
          grid-template-columns: 1fr;
          gap: 1rem;
        }
      }

      @media (max-width: 1200px) {
        .employee-details-grid {
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        }

        .edit-employee-form .employee-details-grid {
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        }
      }
    `
  ]
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
