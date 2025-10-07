import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';



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

      <section class="pov">
        <!-- Quick Actions Section -->
        <div class="quick-actions-section">
          <div class="card-header">
            <h3 class="card-title">
              <span class="title-icon">QA</span>
              Quick Actions
            </h3>
            <div class="header-accent"></div>
          </div>
          <div class="actions-grid">
            <button class="action-card" (click)="addUser()">
              <div class="action-icon add-user-icon">ADD</div>
              <div class="action-content">
                <h4>Add New User</h4>
                <p>Create a new user account</p>
              </div>
            </button>
            <button class="action-card" (click)="manageRoles()">
              <div class="action-icon roles-icon">ROL</div>
              <div class="action-content">
                <h4>Manage Roles</h4>
                <p>Configure user permissions</p>
              </div>
            </button>
            <button class="action-card" (click)="viewReports()">
              <div class="action-icon reports-icon">RPT</div>
              <div class="action-content">
                <h4>View Reports</h4>
                <p>System analytics & insights</p>
              </div>
            </button>
            <button class="action-card" (click)="systemSettings()">
              <div class="action-icon settings-icon">SET</div>
              <div class="action-content">
                <h4>System Settings</h4>
                <p>Configure application settings</p>
              </div>
            </button>
          </div>
        </div>
      </section>
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

      /* Card Styles */
      .quick-actions-section {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1.5rem;
        padding: 2rem;
        transition: all 0.4s ease;
        position: relative;
        overflow: hidden;
      }

      .quick-actions-section::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
        transition: left 0.5s;
      }

      .quick-actions-section:hover::before {
        left: 100%;
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1.5rem;
      }

      .card-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.4rem;
        font-weight: 700;
        margin: 0;
        color: white;
      }

      .title-icon {
        font-size: 0.8rem;
        font-weight: 800;
        background: linear-gradient(135deg, #d97706, #b45309);
        color: white;
        padding: 0.3rem 0.6rem;
        border-radius: 6px;
        letter-spacing: 0.5px;
      }

      .header-accent {
        width: 40px;
        height: 3px;
        background: linear-gradient(135deg, #d97706, #b45309);
        border-radius: 2px;
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

      /* Quick Actions Grid */
      .actions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
      }

      .action-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1rem;
        padding: 1.5rem;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: left;
      }

      .action-card:hover {
        background: rgba(255, 255, 255, 0.08);
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
      }

      .action-icon {
        font-size: 0.9rem;
        font-weight: 800;
        color: white;
        padding: 0.75rem;
        border-radius: 8px;
        letter-spacing: 0.5px;
        flex-shrink: 0;
      }

      .add-user-icon { background: linear-gradient(135deg, #22c55e, #16a34a); }
      .roles-icon { background: linear-gradient(135deg, #3b82f6, #2563eb); }
      .reports-icon { background: linear-gradient(135deg, #f59e0b, #d97706); }
      .settings-icon { background: linear-gradient(135deg, #8b5cf6, #7c3aed); }

      .action-content h4 {
        margin: 0 0 0.25rem 0;
        color: white;
        font-size: 1.1rem;
        font-weight: 600;
      }

      .action-content p {
        margin: 0;
        color: #cbd5e1;
        font-size: 0.9rem;
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

      /* Responsive Design */
      @media (max-width: 768px) {
        .header-content {
          flex-direction: column;
          gap: 1rem;
          text-align: center;
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

        .actions-grid {
          grid-template-columns: 1fr;
        }

        .users-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class AdminComponent implements OnInit {
  ngOnInit() {
    // Initialize any data loading here
  }

  addUser() {
    console.log('Add user clicked');
  }

  manageRoles() {
    console.log('Manage roles clicked');
  }

  viewReports() {
    console.log('View reports clicked');
  }

  systemSettings() {
    console.log('System settings clicked');
  }
}
