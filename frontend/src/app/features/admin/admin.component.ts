import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="admin-dashboard">
      <!-- Animated Background -->
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

      <!-- Header Section -->
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
            <div class="status-pill">
              <span class="status-dot"></span>
              <span>Admin privileges verified</span>
            </div>
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
                        <div class="employee-card" [class.expanded]="isEmployeeExpanded(employee._id)">
                          <!-- Main employee row (always visible) -->
                          <div class="employee-main-row" (click)="toggleEmployeeExpansion(employee._id)">
                            <div class="employee-basic-info">
                              <div class="employee-name-section">
                                <span class="employee-name">{{ employee.name }}</span>
                                <span class="employee-email">{{ employee.email }}</span>
                              </div>
                            </div>
                            <div class="employee-expand-section">
                              <div class="expand-icon" [class.rotated]="isEmployeeExpanded(employee._id)">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                  <path d="M4.707 5.293a1 1 0 0 0-1.414 1.414l4 4a1 1 0 0 0 1.414 0l4-4a1 1 0 0 0-1.414-1.414L8 8.586 4.707 5.293z"/>
                                </svg>
                              </div>
                            </div>
                          </div>

                          <!-- Expanded details (shown when clicked) -->
                          @if (isEmployeeExpanded(employee._id)) {
                            <div class="employee-details">
                              <div class="employee-details-grid">
                                <div class="detail-section">
                                  <label class="detail-label">Employee ID</label>
                                  <span class="detail-value">{{ employee._id }}</span>
                                </div>
                                <div class="detail-section">
                                  <label class="detail-label">Full Name</label>
                                  <span class="detail-value">{{ employee.name }}</span>
                                </div>
                                <div class="detail-section">
                                  <label class="detail-label">Email Address</label>
                                  <span class="detail-value">{{ employee.email }}</span>
                                </div>
                                <div class="detail-section">
                                  <label class="detail-label">Department</label>
                                  <span class="detail-value">{{ employee.department || 'Not assigned' }}</span>
                                </div>
                                <div class="detail-section">
                                  <label class="detail-label">Role</label>
                                  <span class="detail-value">{{ employee.role | titlecase }}</span>
                                </div>
                                <div class="detail-section">
                                  <label class="detail-label">Account Status</label>
                                  <span class="detail-value">{{ (employee.isActive ?? true) ? 'Active' : 'Inactive' }}</span>
                                </div>
                                <div class="detail-section">
                                  <label class="detail-label">Reports To</label>
                                  <span class="detail-value">{{ getSupervisorDisplayText(employee) }}</span>
                                </div>
                              </div>

                              <div class="employee-actions">
                                <button
                                  type="button"
                                  class="btn-secondary action-btn"
                                  [disabled]="removeInFlight() === employee._id"
                                  (click)="confirmDeactivateEmployee(employee); $event.stopPropagation()"
                                >
                                  @if (removeInFlight() === employee._id) {
                                    <span class="inline-spinner" aria-hidden="true"></span>
                                  }
                                  {{ (employee.isActive ?? true) ? 'Deactivate Employee' : 'Remove Employee' }}
                                </button>
                              </div>
                            </div>
                          }
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

      /* Advanced Background - Matching Other Dashboards */
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

      /* Header Section */
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

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(34, 197, 94, 0.1);
        padding: 0.5rem 1rem;
        border-radius: 25px;
        border: 1px solid rgba(34, 197, 94, 0.3);
        backdrop-filter: blur(10px);
      }

      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #22c55e;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
        }
      }

      .status-indicator span {
        color: #22c55e;
        font-weight: 600;
        font-size: 0.9rem;
      }

      /* Main Content */
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

      /* Statistics Grid */
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

      /* Statistics Grid */
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

      /* Button Styles */
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

      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.4rem 0.85rem;
        border-radius: 999px;
        font-size: 0.85rem;
        color: #bbf7d0;
        background: rgba(34, 197, 94, 0.15);
        border: 1px solid rgba(34, 197, 94, 0.35);
        width: fit-content;
      }

      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 10px rgba(34, 197, 94, 0.6);
      }

      .add-button {
        min-width: 180px;
        justify-content: center;
      }

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
      }

      .role-card.accent-supervisor {
        border-color: rgba(248, 113, 113, 0.45);
      }

      .role-card.accent-operator {
        border-color: rgba(45, 212, 191, 0.45);
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

      .employee-card.expanded {
        background: rgba(15, 23, 42, 0.6);
      }

      .employee-main-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }

      .employee-main-row:hover {
        background: rgba(148, 163, 184, 0.05);
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

      .expand-icon {
        transition: transform 0.3s ease;
        color: #94a3b8;
        display: flex;
        align-items: center;
      }

      .expand-icon.rotated {
        transform: rotate(180deg);
      }

      .employee-details {
        padding: 0 1.25rem 1.5rem 1.25rem;
        border-top: 1px solid rgba(148, 163, 184, 0.08);
        animation: slideDown 0.3s ease;
      }

      @keyframes slideDown {
        from {
          opacity: 0;
          max-height: 0;
          padding: 0 1.25rem;
        }
        to {
          opacity: 1;
          max-height: 300px;
          padding: 0 1.25rem 1.5rem 1.25rem;
        }
      }

      .employee-details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
        margin-top: 1rem;
        margin-bottom: 1.5rem;
      }

      .detail-section {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
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

      .department-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.6rem;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.15);
        color: #e2e8f0;
        font-size: 0.8rem;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem 0.75rem;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .badge-admin {
        background: rgba(59, 130, 246, 0.2);
        color: #93c5fd;
      }

      .badge-hr {
        background: rgba(129, 140, 248, 0.2);
        color: #c7d2fe;
      }

      .badge-supervisor {
        background: rgba(248, 113, 113, 0.2);
        color: #fecdd3;
      }

      .badge-operator {
        background: rgba(45, 212, 191, 0.2);
        color: #99f6e4;
      }

      .status-active,
      .status-inactive {
        font-weight: 600;
        font-size: 0.85rem;
      }

      .status-active {
        color: #4ade80;
      }

      .status-inactive {
        color: #fca5a5;
      }

      .empty-state {
        padding: 2rem 1.25rem;
        text-align: center;
        color: #94a3b8;
        font-size: 0.95rem;
      }

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

      /* Responsive Design */
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

        .users-grid {
          grid-template-columns: 1fr;
        }

        .role-grid {
          grid-template-columns: 1fr;
        }

        .role-header {
          flex-direction: column;
          align-items: flex-start;
        }

        .actions-header,
        .actions-cell {
          text-align: left;
        }
      }
    `
  ]
})
export class AdminComponent {
  // Dependency injection wiring for routing, API access, and lifecycle cleanup delegates.
  private readonly fb = inject(FormBuilder);
  private readonly employeeService = inject(EmployeeService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // Role presentation metadata powering the segmented dashboard view.
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

  // Session context used to enforce admin-only functionality across the POV.
  protected readonly currentEmployee = computed(() => this.authService.employee());
  protected readonly isAdmin = computed(() => this.currentEmployee()?.role === 'admin');

  // Employee roster state management backing the list, modals, and mutations.
  protected readonly employees = signal<Employee[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly mutationError = signal<string | null>(null);
  protected readonly removeInFlight = signal<string | null>(null);
  protected readonly isModalOpen = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly expandedEmployee = signal<string | null>(null);

  // Add-employee modal form configuration and validation rules.
  protected readonly addEmployeeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role: ['operator' as Employee['role'], Validators.required],
    department: ['', Validators.required]
  });

  // Department dropdown options derived from the live employee roster.
  protected readonly departmentOptions = computed(() => {
    const departments = new Set(
      this.employees()
        .map(employee => employee.department)
        .filter((department): department is string => !!department)
    );

    return Array.from(departments).sort((a, b) => a.localeCompare(b));
  });

  // Aggregated metrics driving the stat tiles at the top of the POV.
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

  // Role-based grouping used to render the four-column employee layout.
  protected readonly groupedEmployees = computed(() =>
    this.roleSegments.map(segment => ({
      ...segment,
      employees: this.employees().filter(employee => employee.role === segment.role)
    }))
  );

  // Effect bootstraps the view by validating access and loading the roster.
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

  // Helper exposed to the template for manual refresh actions.
  protected reloadEmployees(): void {
    this.loadEmployees();
  }

  // Toggle employee detail expansion
  protected toggleEmployeeExpansion(employeeId: string): void {
    const currentExpanded = this.expandedEmployee();
    this.expandedEmployee.set(currentExpanded === employeeId ? null : employeeId);
  }

  // Check if employee is expanded
  protected isEmployeeExpanded(employeeId: string): boolean {
    return this.expandedEmployee() === employeeId;
  }

  // Maps an employee role to the corresponding badge styling class.
  protected roleBadge(role: Employee['role']): string {
    switch (role) {
      case 'admin':
        return 'badge badge-admin';
      case 'hr':
        return 'badge badge-hr';
      case 'supervisor':
        return 'badge badge-supervisor';
      default:
        return 'badge badge-operator';
    }
  }

  // Gets ALL supervisors for an employee based on their department
  protected getSupervisorsForEmployee(employee: Employee): Employee[] {
    const employees = this.employees();

    // Find all supervisors in the same department
    const supervisors = employees.filter(emp =>
      emp.role === 'supervisor' &&
      emp.department === employee.department &&
      emp._id !== employee._id &&
      (emp.isActive ?? true)
    );

    return supervisors;
  }

  // Gets ALL HR people (they oversee all departments)
  protected getAllHRPeople(): Employee[] {
    const employees = this.employees();

    // Find all active HR people regardless of department
    const hrPeople = employees.filter(emp =>
      emp.role === 'hr' &&
      (emp.isActive ?? true)
    );

    return hrPeople;
  }

  // Gets a user-friendly supervisor display text
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
        // Multiple HR people - show all names
        return hrPeople.map(hr => hr.name).join(', ');
      }
    }

    // For operators and other roles
    const supervisors = this.getSupervisorsForEmployee(employee);

    if (supervisors.length === 0) {
      return 'No supervisor assigned';
    } else if (supervisors.length === 1) {
      return supervisors[0].name;
    } else {
      // Multiple supervisors - show all names
      return supervisors.map(s => s.name).join(', ');
    }
  }

  // Opens the add employee modal with a clean slate state.
  protected openAddEmployeeModal(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.mutationError.set(null);
    this.isModalOpen.set(true);
    this.resetAddEmployeeForm();
  }

  // Closes the modal and clears any pending form state.
  protected closeAddEmployeeModal(): void {
    this.isModalOpen.set(false);
    this.resetAddEmployeeForm();
  }

  // Submits the modal form to create a new employee and refresh the roster.
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

  // Confirms and executes the deactivate/remove workflow for an employee.
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
        next: () => this.loadEmployees(),
        error: error => {
          console.error('Failed to update employee status', error);
          this.mutationError.set(`Unable to update ${employee.name}. Please retry.`);
        }
      });
  }

  // Centralized roster fetch used across lifecycle and manual refresh actions.
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

  // Resets the modal form to default values and clears control state flags.
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
