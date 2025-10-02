import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { ApiService, DataFilters, FermentationRequest, FermentationResponse } from '../../core/services/api.service';


type ModalFieldKey =
  | 'date'
  | 'plant'
  | 'product'
  | 'campaign'
  | 'stage'
  | 'tank'
  | 'levelIndicator'
  | 'weight'
  | 'receivedAmount'
  ;

type ModalRow = Partial<Record<ModalFieldKey, unknown>> & { readonly _id?: string };

interface ModalField {
  readonly key: ModalFieldKey;
  readonly label: string;
  readonly type: 'text' | 'number' | 'date';
}

type FermentationFormValue = Record<ModalFieldKey, unknown>;


@Component({
  selector: 'app-fermentation-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="fermentation-dashboard">
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
            <div class="title-text">
              <h1>Fermentation Operations</h1>
              <p>Real-time monitoring and analytics for fermentation workflows</p>
            </div>
          </div>
        </div>
      </header>

      <section class="pov" [class.modal-open]="editingRow()">
        <!-- Filters Card -->
        <div class="filters-card">
          <h3 class="card-title">
            Filter Data
          </h3>
          <form [formGroup]="filterForm" class="filters" (ngSubmit)="onSubmit()">
            <label>
              <span>Date</span>
              <input type="date" formControlName="date" />
            </label>
            <label>
              <span>Plant</span>
              <input type="text" formControlName="plant" placeholder="Enter plant number" />
            </label>
            <label>
              <span>Product</span>
              <input type="text" formControlName="product" placeholder="Enter product" />
            </label>
            <label>
              <span>Stage</span>
              <input type="text" formControlName="stage" placeholder="Fermentation stage" />
            </label>
            <label>
              <span>Campaign</span>
              <input type="text" formControlName="campaign" placeholder="Campaign ID" />
            </label>
            <div class="actions">
              <button type="submit" class="btn-primary">
                Apply Filters
              </button>
              <button type="button" (click)="resetFilters()" class="btn-secondary">
                Reset
              </button>
            </div>
          </form>
        </div>

        <!-- Statistics Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">WT</div>
                <div class="stat-icon-glow weight-glow"></div>
              </div>
              <span class="stat-label">Total Weight</span>
            </div>
            <div class="stat-value">{{ stats().totalWeight | number:'1.0-2' }} lbs</div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">RCV</div>
                <div class="stat-icon-glow received-glow"></div>
              </div>
              <span class="stat-label">Total Received</span>
            </div>
            <div class="stat-value">{{ stats().totalReceived | number:'1.0-2' }} lbs</div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <div class="stat-icon-wrapper">
                <div class="stat-icon">LVL</div>
                <div class="stat-icon-glow level-glow"></div>
              </div>
              <span class="stat-label">Avg Level Indicator</span>
            </div>
            <div class="stat-value">{{ stats().avgLevelIndicator | number:'1.0-2' }}</div>
          </div>
        </div>

        <!-- Quick Add Section -->
        <div class="quick-add-section">
          <div class="card-header">
            <h3 class="card-title">
              Add New Record
            </h3>
            <div class="header-accent"></div>
          </div>
          <div class="quick-add-form">
            <div class="quick-add-grid">
              <label>
                <span>Date</span>
                <input type="date" [formControl]="quickAddControls.date" />
              </label>
              <label>
                <span>Plant</span>
                <input type="text" [formControl]="quickAddControls.plant" placeholder="Plant number" />
              </label>
              <label>
                <span>Product</span>
                <input type="text" [formControl]="quickAddControls.product" placeholder="Product name" />
              </label>
              <label>
                <span>Campaign</span>
                <input type="text" [formControl]="quickAddControls.campaign" placeholder="Campaign ID" />
              </label>
              <label>
                <span>Stage</span>
                <input type="text" [formControl]="quickAddControls.stage" placeholder="Fermentation stage" />
              </label>
              <label>
                <span>Tank</span>
                <input type="text" [formControl]="quickAddControls.tank" placeholder="Tank identifier" />
              </label>
              <label>
                <span>Level Indicator</span>
                <input type="text" [formControl]="quickAddControls.levelIndicator" placeholder="Level indicator" />
              </label>
              <label>
                <span>Weight (lbs)</span>
                <input type="number" [formControl]="quickAddControls.weight" placeholder="0.00" step="any" />
              </label>
              <label>
                <span>Received (lbs)</span>
                <input type="number" [formControl]="quickAddControls.receivedAmount" placeholder="0.00" step="any" />
              </label>
            </div>
            @if (quickSaveError()) {
              <div class="error-message">
                <span class="error-icon">ERROR</span>
                {{ quickSaveError() }}
              </div>
            }
            <div class="quick-add-actions">
              <button type="button" class="quick-save-btn" (click)="quickSave()" [disabled]="!canQuickSave()">
                @if (isQuickSaving()) {
                  <div class="loading-spinner"></div>
                  <span class="saving">Saving...</span>
                } @else {
                  Save Record
                }
              </button>
              <button type="button" class="quick-clear-btn" (click)="resetQuickAddForm()" [disabled]="isQuickSaving()">
                Clear Form
              </button>
            </div>
          </div>
        </div>

        <!-- Data Table Section -->
        <div class="data-section">
          <div class="section-header">
            <h3 class="section-title">
              Fermentation Records
            </h3>
            <div class="record-count">
              {{ rows().length }} record{{ rows().length !== 1 ? 's' : '' }}
            </div>
          </div>

          @if (!isLoading()) {
            <div class="table-container" [class.dimmed]="editingRow()">
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plant</th>
                      <th>Product</th>
                      <th>Campaign</th>
                      <th>Stage</th>
                      <th>Tank</th>
                      <th>Level Indicator</th>
                      <th>Weight (lbs)</th>
                      <th>Received (lbs)</th>
                      <th class="actions-header">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of rows(); track row._id || $index) {
                      <tr class="data-row">
                        <td class="date-cell">{{ row.date | date:'MMM dd, yyyy' }}</td>
                        <td class="plant-cell">
                          <span class="plant-badge">{{ row.plant }}</span>
                        </td>
                        <td class="product-cell">{{ row.product }}</td>
                        <td class="campaign-cell">
                          <span class="campaign-badge">{{ row.campaign }}</span>
                        </td>
                        <td class="stage-cell">{{ row.stage }}</td>
                        <td class="tank-cell">{{ row.tank }}</td>
                        <td class="level-indicator-cell">{{ row.levelIndicator }}</td>
                        <td class="amount-cell incoming">
                          <span class="amount-value">{{ resolveNumber(row.weightLbs, row.weight) | number:'1.0-2' }}</span>
                        </td>
                        <td class="amount-cell outgoing">
                          <span class="amount-value">{{ resolveNumber(row.receivedAmountLbs, row.receivedAmount) | number:'1.0-2' }}</span>
                        </td>
                        <td class="actions-cell">
                          <button type="button" class="edit-button" (click)="openEditModal(row)">
                            Edit
                          </button>
                        </td>
                      </tr>
                    } @empty {
                      <tr class="empty-row">
                        <td colspan="10" class="empty-message">
                          <div class="empty-content">
                            <div class="empty-icon">NO DATA</div>
                            <h4>No Records Found</h4>
                            <p>No fermentation records match your current filters. Try adjusting your search criteria or add a new record.</p>
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          } @else {
            <div class="loading-container">
              <div class="loading-content">
                <div class="loading-spinner large"></div>
                <h4>Loading Data</h4>
                <p>Fetching fermentation records...</p>
              </div>
            </div>
          }
        </div>

        <!-- Modal for editing -->
        @if (editingRow()) {
          <div class="modal-backdrop">
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
              <header class="modal-header">
                <div class="modal-title-section">
                  <div class="modal-icon">EDIT</div>
                  <h2 id="edit-modal-title">Edit Fermentation Record</h2>
                </div>
                <button type="button" class="modal-close" (click)="closeEditModal()" aria-label="Close">
                  <span class="close-icon">X</span>
                </button>
              </header>
              <form class="modal-form" [formGroup]="editForm" (ngSubmit)="submitEdit()">
                <div class="modal-grid">
                  @for (field of modalFields; track field.key) {
                    <label [attr.for]="'field-' + field.key" class="modal-field">
                      <span class="field-label">{{ field.label }}</span>
                      <input
                        [id]="'field-' + field.key"
                        [type]="field.type"
                        [formControlName]="field.key"
                        [attr.placeholder]="field.label"
                        class="field-input"
                      />
                    </label>
                  }
                </div>
                @if (mutationError()) {
                  <div class="error-message modal-error">
                    <span class="error-icon">ERROR</span>
                    {{ mutationError() }}
                  </div>
                }
                <div class="modal-actions">
                  <button type="submit" class="btn-primary modal-btn" [disabled]="!canSubmitEdit()">
                    Save Changes
                  </button>
                  <button type="button" class="btn-danger modal-btn" (click)="deleteCurrentRow()" [disabled]="!canDelete()">
                    Delete Record
                  </button>
                  <button type="button" class="btn-secondary modal-btn" (click)="closeEditModal()" [disabled]="isMutating()">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        }
      </section>
    </div>
  `,
  styles: [
    `
      * {
        box-sizing: border-box;
      }

      .fermentation-dashboard {
        min-height: 100vh;
        position: relative;
        overflow-x: hidden;
        background: #0a0f1c;
        color: white;
      }

      /* Advanced Background - Matching Home Component */
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
        background: linear-gradient(45deg, rgba(29, 78, 216, 0.1), rgba(34, 197, 94, 0.1));
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
          radial-gradient(circle at 20% 30%, rgba(29, 78, 216, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
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
        color: #f59e0b;
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
        background: radial-gradient(circle, rgba(245, 158, 11, 0.4) 0%, transparent 70%);
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
        background: linear-gradient(135deg, #ffffff 0%, #8b5cf6 100%);
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
      .filters-card,
      .quick-add-section,
      .data-section {
        background: rgba(255, 255, 255, 0.03);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1.5rem;
        padding: 2rem;
        transition: all 0.4s ease;
        position: relative;
        overflow: hidden;
      }

      .filters-card::before,
      .quick-add-section::before,
      .data-section::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent);
        transition: left 0.5s;
      }

      .filters-card:hover::before,
      .quick-add-section:hover::before,
      .data-section:hover::before {
        left: 100%;
      }

      .card-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.4rem;
        font-weight: 700;
        margin: 0 0 1.5rem 0;
        color: white;
      }

      .title-icon {
        font-size: 0.8rem;
        font-weight: 800;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        padding: 0.3rem 0.6rem;
        border-radius: 6px;
        letter-spacing: 0.5px;
      }

      /* Filters */
      .filters {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        align-items: end;
      }

      .filters label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #e2e8f0;
        font-weight: 500;
      }

      .filters input {
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.05);
        color: white;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .filters input:focus {
        outline: none;
        border-color: #f59e0b;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
      }

      .filters input::placeholder {
        color: #94a3b8;
      }

      .actions {
        display: flex;
        gap: 1rem;
        align-items: end;
      }

      /* Button Styles */
      .btn-primary,
      .btn-secondary,
      .btn-danger {
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
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
      }

      .btn-primary:hover:not(:disabled) {
        background: linear-gradient(135deg, #d97706, #b45309);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
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

      .btn-danger {
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
      }

      .btn-danger:hover:not(:disabled) {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
      }

      .btn-icon {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.5px;
      }

      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
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
        background: linear-gradient(135deg, #1d4ed8, #3b82f6);
        color: white;
        padding: 0.4rem 0.6rem;
        border-radius: 6px;
        letter-spacing: 0.5px;
        min-width: 40px;
        text-align: center;
        position: relative;
        z-index: 1;
      }

      .stat-icon-glow {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 35px;
        height: 35px;
        border-radius: 6px;
        filter: blur(8px);
        opacity: 0.6;
        animation: statGlow 3s ease-in-out infinite alternate;
      }

      .weight-glow {
        background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
      }
      .received-glow {
        background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
      }
      .level-glow {
        background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
      }

      @keyframes statGlow {
        0% {
          opacity: 0.4;
          transform: translate(-50%, -50%) scale(0.8);
        }
        100% {
          opacity: 0.8;
          transform: translate(-50%, -50%) scale(1.2);
        }
      }

      .stat-label {
        color: #cbd5e1;
        font-size: 0.9rem;
        font-weight: 500;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 800;
        color: white;
        margin-bottom: 0.5rem;
        display: block;
      }

      .stat-value.negative {
        color: #ef4444;
      }

      .stat-trend {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .stat-trend.positive {
        color: #22c55e;
      }

      .stat-trend.negative {
        color: #ef4444;
      }

      .trend-icon {
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.5px;
      }

      /* Quick Add Section */
      .card-header {
        position: relative;
        margin-bottom: 1.5rem;
      }

      .header-accent {
        position: absolute;
        bottom: -0.5rem;
        left: 0;
        height: 3px;
        width: 60px;
        background: linear-gradient(90deg, #f59e0b, #22c55e);
        border-radius: 2px;
      }

      .quick-add-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .quick-add-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
      }

      .quick-add-grid label {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        font-size: 0.9rem;
        color: #e2e8f0;
        font-weight: 500;
      }

      .quick-add-grid input {
        padding: 0.75rem 1rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0.75rem;
        font-size: 0.9rem;
        background: rgba(255, 255, 255, 0.05);
        color: white;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .quick-add-grid input:focus {
        outline: none;
        border-color: #22c55e;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
      }

      .quick-add-grid input::placeholder {
        color: #94a3b8;
      }

      .quick-add-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        align-items: center;
      }

      .quick-save-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 0.75rem;
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: white;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
      }

      .quick-save-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #16a34a, #15803d);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
      }

      .quick-clear-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0.75rem;
        background: rgba(255, 255, 255, 0.05);
        color: #e2e8f0;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .quick-clear-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
        color: white;
        transform: translateY(-2px);
      }

      /* Error Message */
      .error-message {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 0.75rem;
        color: #fca5a5;
        font-size: 0.9rem;
        backdrop-filter: blur(10px);
      }

      .error-icon {
        font-size: 0.7rem;
        font-weight: 800;
        background: #ef4444;
        color: white;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }

      /* Data Section */
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.4rem;
        font-weight: 700;
        margin: 0;
        color: white;
      }

      .record-count {
        background: rgba(34, 197, 94, 0.1);
        color: #22c55e;
        padding: 0.4rem 1rem;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 600;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }

      /* Table Styles */
      .table-container {
        position: relative;
        transition: opacity 0.3s ease;
      }

      .table-container.dimmed {
        opacity: 0.4;
        pointer-events: none;
      }

      .table-wrapper {
        background: rgba(255, 255, 255, 0.02);
        border-radius: 1rem;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .data-table {
        width: 100%;
        border-collapse: collapse;
      }

      .data-table thead {
        background: rgba(255, 255, 255, 0.05);
      }

      .data-table th {
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        color: #e2e8f0;
        font-size: 0.9rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .data-table td {
        padding: 1rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        font-size: 0.9rem;
        transition: all 0.3s ease;
      }

      .data-row:hover {
        background: rgba(255, 255, 255, 0.03);
      }

      .date-cell {
        color: #cbd5e1;
        font-weight: 500;
      }

      .plant-badge,
      .campaign-badge {
        background: rgba(29, 78, 216, 0.2);
        color: #93c5fd;
        padding: 0.3rem 0.8rem;
        border-radius: 15px;
        font-size: 0.8rem;
        border: 1px solid rgba(29, 78, 216, 0.3);
        display: inline-block;
      }

      .campaign-badge {
        background: rgba(34, 197, 94, 0.2);
        color: #86efac;
        border-color: rgba(34, 197, 94, 0.3);
      }

      .amount-cell {
        font-weight: 600;
        font-family: 'Courier New', monospace;
      }

      .amount-cell.incoming .amount-value {
        color: #22c55e;
      }

      .amount-cell.outgoing .amount-value {
        color: #f59e0b;
      }

      .edit-button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 20px;
        background: rgba(245, 158, 11, 0.1);
        color: #fbbf24;
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .edit-button:hover {
        background: rgba(245, 158, 11, 0.2);
        transform: scale(1.05);
      }

      /* Empty State */
      .empty-row .empty-message {
        text-align: center;
        padding: 3rem;
      }

      .empty-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .empty-icon {
        font-size: 1.5rem;
        font-weight: 800;
        color: #64748b;
        background: rgba(100, 116, 139, 0.1);
        padding: 1rem 1.5rem;
        border-radius: 12px;
        letter-spacing: 1px;
        border: 2px dashed rgba(100, 116, 139, 0.3);
      }

      .empty-content h4 {
        margin: 0;
        color: #cbd5e1;
        font-size: 1.2rem;
      }

      .empty-content p {
        margin: 0;
        color: #94a3b8;
        max-width: 400px;
        line-height: 1.6;
      }

      /* Loading State */
      .loading-container {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 4rem;
      }

      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        text-align: center;
      }

      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid rgba(255, 255, 255, 0.1);
        border-top: 3px solid #f59e0b;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .loading-spinner.large {
        width: 48px;
        height: 48px;
        border-width: 4px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .loading-content h4 {
        margin: 0;
        color: #e2e8f0;
        font-size: 1.2rem;
      }

      .loading-content p {
        margin: 0;
        color: #94a3b8;
      }

      /* Modal Styles */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(10, 15, 28, 0.8);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        z-index: 1000;
      }

      .modal {
        width: min(600px, 100%);
        max-height: calc(100vh - 4rem);
        background: rgba(30, 41, 59, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 1.5rem;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem 2rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.02);
      }

      .modal-title-section {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .modal-icon {
        font-size: 0.9rem;
        font-weight: 800;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        padding: 0.4rem 0.6rem;
        border-radius: 6px;
        letter-spacing: 0.5px;
      }

      .modal-header h2 {
        margin: 0;
        font-size: 1.3rem;
        color: white;
        font-weight: 700;
      }

      .modal-close {
        border: none;
        background: rgba(255, 255, 255, 0.1);
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        color: #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
      }

      .modal-close:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #fca5a5;
      }

      .close-icon {
        font-size: 1.4rem;
        line-height: 1;
        font-weight: 400;
      }

      .modal-form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 2rem;
        overflow-y: auto;
      }

      .modal-grid {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      }

      .modal-field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .field-label {
        font-size: 0.9rem;
        color: #e2e8f0;
        font-weight: 500;
      }

      .field-input {
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(255, 255, 255, 0.05);
        color: white;
        font-size: 0.9rem;
        transition: all 0.3s ease;
        backdrop-filter: blur(10px);
      }

      .field-input:focus {
        outline: none;
        border-color: #f59e0b;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
      }

      .field-input::placeholder {
        color: #94a3b8;
      }

      .modal-error {
        margin: 0;
      }

      .modal-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: flex-end;
        padding-top: 1rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .modal-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.5rem;
        font-size: 0.9rem;
        font-weight: 600;
      }

      /* Responsive Design */
      @media (max-width: 1200px) {
        .header-content {
          flex-direction: column;
          gap: 1rem;
          text-align: center;
        }
      }

      @media (max-width: 768px) {
        .fermentation-dashboard {
          padding: 0;
        }

        .dashboard-header {
          padding: 1.5rem 1rem;
        }

        .title-text h1 {
          font-size: 2rem;
        }

        .pov {
          padding: 1.5rem 1rem;
        }

        .filters-card,
        .quick-add-section,
        .data-section {
          padding: 1.5rem;
        }

        .filters {
          grid-template-columns: 1fr;
        }

        .actions {
          flex-direction: column;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }

        .quick-add-grid {
          grid-template-columns: 1fr;
        }

        .quick-add-actions {
          flex-direction: column;
        }

        .table-wrapper {
          overflow-x: auto;
        }

        .data-table {
          min-width: 800px;
        }

        .modal {
          margin: 1rem;
          max-height: calc(100vh - 2rem);
        }

        .modal-header {
          padding: 1rem 1.5rem;
        }

        .modal-form {
          padding: 1.5rem;
        }

        .modal-grid {
          grid-template-columns: 1fr;
        }

        .modal-actions {
          flex-direction: column;
        }
      }

      @media (max-width: 480px) {
        .dashboard-header {
          padding: 1rem;
        }

        .title-text h1 {
          font-size: 1.8rem;
        }

        .pov {
          padding: 1rem;
        }

        .filters-card,
        .quick-add-section,
        .data-section {
          padding: 1rem;
        }
      }
    `
  ]
})
// Exported: used in app.routes.ts for lazy loading
export class FermentationDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterForm = this.fb.nonNullable.group({
    date: '',
    plant: '',
    product: '',
    stage: '',
    campaign: ''
  });

  protected readonly rows = signal<FermentationResponse[]>([]);
  protected readonly isLoading = signal(false);

  protected readonly editingRow = signal<ModalRow | null>(null);

  protected readonly editForm = this.fb.group({
    date: ['', Validators.required],
    plant: ['', Validators.required],
    product: ['', Validators.required],
    campaign: ['', Validators.required],
    stage: ['', Validators.required],
    tank: ['', Validators.required],
    levelIndicator: ['', Validators.required],
    weight: [null as number | null, [Validators.required, Validators.min(0)]],
    receivedAmount: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  protected readonly isMutating = signal(false);
  protected readonly mutationError = signal<string | null>(null);

  // Quick add controls for inline table entry
  protected readonly quickAddControls = {
    date: new FormControl('', Validators.required),
    plant: new FormControl('', Validators.required),
    product: new FormControl('', Validators.required),
    campaign: new FormControl('', Validators.required),
    stage: new FormControl('', Validators.required),
    tank: new FormControl('', Validators.required),
    levelIndicator: new FormControl('', Validators.required),
    weight: new FormControl(null as number | null, [Validators.required, Validators.min(0)]),
    receivedAmount: new FormControl(null as number | null, [Validators.required, Validators.min(0)])
  };

  protected readonly isQuickSaving = signal(false);
  protected readonly quickSaveError = signal<string | null>(null);

  protected canQuickSave(): boolean {
    // Method gets called on every change detection cycle
    const controls = this.quickAddControls;
    const dateValue = controls.date.value;
    const plantValue = controls.plant.value;
    const productValue = controls.product.value;
    const campaignValue = controls.campaign.value;
    const stageValue = controls.stage.value;
    const tankValue = controls.tank.value;
    const levelIndicatorValue = controls.levelIndicator.value;
    const weightValue = controls.weight.value;
    const receivedAmountValue = controls.receivedAmount.value;

    return !this.isQuickSaving() &&
           !!dateValue &&
           !!plantValue &&
           !!productValue &&
           !!campaignValue &&
           !!stageValue &&
           !!tankValue &&
           !!levelIndicatorValue &&
           weightValue !== null && weightValue !== undefined && weightValue >= 0 &&
           receivedAmountValue !== null && receivedAmountValue !== undefined && receivedAmountValue >= 0;
  }

  // Computed signals for derived state
  protected readonly hasData = computed(() => this.rows().length > 0);
  protected readonly recordCount = computed(() => this.rows().length);
  protected readonly isModalOpen = computed(() => !!this.editingRow());
  protected readonly canSubmitEdit = computed(() => !this.isMutating() && this.editForm.valid);
  protected readonly canDelete = computed(() => !this.isMutating() && !!this.editingRow()?._id);

  protected readonly modalFields: readonly ModalField[] = [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'plant', label: 'Plant', type: 'text' },
    { key: 'product', label: 'Product', type: 'text' },
    { key: 'campaign', label: 'Campaign', type: 'text' },
    { key: 'stage', label: 'Stage', type: 'text' },
    { key: 'tank', label: 'Tank', type: 'text' },
    { key: 'levelIndicator', label: 'Level Indicator', type: 'text' },
    { key: 'weight', label: 'Weight (lbs)', type: 'number' },
    { key: 'receivedAmount', label: 'Received (lbs)', type: 'number' }
  ] as const;

  protected readonly stats = computed(() => {
    const data = this.rows();
    if (!data.length) {
      return {
        totalWeight: 0,
        totalReceived: 0,
        avgLevelIndicator: 0
      } as const;
    }

    const totals = data.reduce(
      (acc, item) => {
        acc.totalWeight += this.resolveNumber(item.weightLbs, item.weight);
        acc.totalReceived += this.resolveNumber(item.receivedAmountLbs, item.receivedAmount);

        const numericIndicator = this.parseLevelIndicator(item.levelIndicator);
        if (numericIndicator !== null) {
          acc.levelSum += numericIndicator;
          acc.levelCount += 1;
        }
        return acc;
      },
      { totalWeight: 0, totalReceived: 0, levelSum: 0, levelCount: 0 }
    );

    return {
      totalWeight: totals.totalWeight,
      totalReceived: totals.totalReceived,
      avgLevelIndicator: totals.levelCount ? totals.levelSum / totals.levelCount : 0
    } as const;
  });

  // Effects for side effects management
  private readonly filterChangesEffect = effect(() => {
    // React to filter form changes with debounced loading
    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData());
  });

  private readonly modalStateEffect = effect(() => {
    // Clear mutation errors when modal opens/closes
    const isOpen = this.isModalOpen();
    if (!isOpen) {
      this.mutationError.set(null);
      this.isMutating.set(false);
    }
  });

  private readonly loadingStateEffect = effect(() => {
    // Log loading state changes for debugging
    const loading = this.isLoading();
    const count = this.recordCount();
    if (!loading && count > 0) {
      console.debug(`Loaded ${count} fermentation records`);
    }
  }, { allowSignalWrites: false });

  ngOnInit(): void {
    // Initial data load
    this.loadData();
  }

  protected onSubmit(): void {
    this.loadData();
  }

  protected resetFilters(): void {
    this.filterForm.reset({ date: '', plant: '', product: '', stage: '', campaign: '' });
    this.loadData();
  }

  protected quickSave(): void {
    if (!this.canQuickSave()) {
      Object.values(this.quickAddControls).forEach(control => control.markAsTouched());
      return;
    }

    const formData = {
      date: this.quickAddControls.date.value,
      plant: this.quickAddControls.plant.value,
      product: this.quickAddControls.product.value,
      campaign: this.quickAddControls.campaign.value,
      stage: this.quickAddControls.stage.value,
      tank: this.quickAddControls.tank.value,
      levelIndicator: this.quickAddControls.levelIndicator.value,
      weight: this.quickAddControls.weight.value,
      receivedAmount: this.quickAddControls.receivedAmount.value
    };

    let payload: FermentationRequest;
    try {
      payload = this.buildFermentationPayloadFromRaw(formData as FermentationFormValue);
    } catch (err) {
      console.error('Unable to prepare quick add payload', err);
      this.quickSaveError.set('Unable to prepare data.');
      return;
    }

    this.isQuickSaving.set(true);
    this.quickSaveError.set(null);

    this.apiService
      .addFermentationEntry(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newRecord) => {
          this.rows.update(rows => [newRecord, ...rows]);
          this.resetQuickAddForm();
          this.isQuickSaving.set(false);
        },
        error: (err) => {
          console.error('Failed to add fermentation record', err);
          this.isQuickSaving.set(false);
          this.quickSaveError.set('Failed to add record.');
        }
      });
  }

  protected resetQuickAddForm(): void {
    Object.values(this.quickAddControls).forEach(control => {
      control.reset();
      control.markAsUntouched();
    });
  }

  protected openEditModal(row: FermentationResponse): void {
    this.mutationError.set(null);
    this.isMutating.set(false);

    this.editForm.reset({
      date: this.normalizeDateValue(row.date),
      plant: row.plant ?? '',
      product: row.product ?? '',
      campaign: row.campaign ?? '',
      stage: row.stage ?? '',
      tank: row.tank ?? '',
      levelIndicator: row.levelIndicator ?? '',
      weight: this.coerceNumber(row.weightLbs ?? row.weight),
      receivedAmount: this.coerceNumber(row.receivedAmountLbs ?? row.receivedAmount)
    });

    this.editingRow.set({ ...row });
  }

  protected closeEditModal(): void {
    this.editForm.reset();
    this.editingRow.set(null);
    this.mutationError.set(null);
    this.isMutating.set(false);
  }

  protected submitEdit(): void {
    const current = this.editingRow();

    if (!current?._id) {
      console.warn('Attempted to save fermentation record without an identifier.');
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    let payload: FermentationRequest;
    try {
      payload = this.buildFermentationPayload();
    } catch (err) {
      this.mutationError.set('Unable to prepare fermentation payload.');
      return;
    }

    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .updateFermentation(current._id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.rows.update((rows) =>
            rows.map((item) => (item._id === updated._id ? { ...item, ...updated } : item))
          );
          this.isMutating.set(false);
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Failed to update fermentation record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to update fermentation record.');
        }
      });
  }

  protected deleteCurrentRow(): void {
    const current = this.editingRow();

    if (!current?._id) {
      console.warn('Attempted to delete fermentation record without an identifier.');
      return;
    }

    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .deleteFermentation(current._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.rows.update((rows) => rows.filter((item) => item._id !== current._id));
          this.isMutating.set(false);
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Failed to delete fermentation record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to delete fermentation record.');
        }
      });
  }

  private buildFermentationPayload(): FermentationRequest {
    return this.buildFermentationPayloadFromRaw(this.editForm.getRawValue() as FermentationFormValue);
  }

  private buildFermentationPayloadFromRaw(raw: FermentationFormValue): FermentationRequest {
    const normalizedDate = this.normalizeDateValue(raw.date);

    if (!normalizedDate) {
      throw new Error('Invalid date provided');
    }

    const parsedDate = new Date(normalizedDate);
    const weight = this.coerceNumber(raw.weight);
    const receivedAmount = this.coerceNumber(raw.receivedAmount);

    if (weight === null || receivedAmount === null) {
      throw new Error('Invalid weight or received amount');
    }

    return {
      date: parsedDate.toISOString(),
      plant: this.coerceString(raw.plant),
      product: this.coerceString(raw.product),
      campaign: this.coerceString(raw.campaign),
      stage: this.coerceString(raw.stage),
      tank: this.coerceString(raw.tank),
      levelIndicator: this.coerceString(raw.levelIndicator),
      weight,
      receivedAmount
    };
  }

  private normalizeDateValue(value: unknown): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? '' : value.toISOString().split('T')[0];
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    }

    return '';
  }

  private coerceNumber(value: unknown): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/[^0-9.-]/g, '');
      if (!normalized) {
        return null;
      }
      const parsedValue = Number(normalized);
      return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private coerceString(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    return '';
  }
  protected resolveNumber(primary?: number | null, fallback?: number | null): number {
    return (primary ?? fallback ?? 0) as number;
  }

  private parseLevelIndicator(value?: string | null): number | null {
    if (!value) {
      return null;
    }
    const numeric = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  }

  private buildFilters(): DataFilters {
    const raw = this.filterForm.getRawValue();
    const filters: DataFilters = {};

    Object.entries(raw).forEach(([key, value]) => {
      if (value) {
        filters[key as keyof DataFilters] = value;
      }
    });

    return filters;
  }

  private loadData(): void {
    this.isLoading.set(true);
    const filters = this.buildFilters();


    this.apiService
      .getFermentationData(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.rows.set(Array.isArray(data) ? data : []);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load fermentation data', err);
          this.rows.set([]);
          this.isLoading.set(false);
        }
      });
  }
}

/* Added manual entry form with API create hook, toggled visibility, and refresh wiring. */

