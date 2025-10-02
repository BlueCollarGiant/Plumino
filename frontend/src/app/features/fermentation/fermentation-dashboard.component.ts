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
    <section class="pov" [class.modal-open]="editingRow()">
      <form [formGroup]="filterForm" class="filters" (ngSubmit)="onSubmit()">
        <label>
          <span>Date</span>
          <input type="date" formControlName="date" />
        </label>
        <label>
          <span>Plant</span>
          <input type="text" formControlName="plant" placeholder="Plant" />
        </label>
        <label>
          <span>Product</span>
          <input type="text" formControlName="product" placeholder="Product" />
        </label>
        <label>
          <span>Stage</span>
          <input type="text" formControlName="stage" placeholder="Stage" />
        </label>
        <label>
          <span>Campaign</span>
          <input type="text" formControlName="campaign" placeholder="Campaign" />
        </label>
        <div class="actions">
          <button type="submit">Apply</button>
          <button type="button" (click)="resetFilters()">Reset</button>
        </div>
      </form>

      <div class="summary">
        <div>
          <span class="label">Total Weight (lbs)</span>
          <span class="value">{{ stats().totalWeight | number:'1.0-2' }}</span>
        </div>
        <div>
          <span class="label">Total Received (lbs)</span>
          <span class="value">{{ stats().totalReceived | number:'1.0-2' }}</span>
        </div>
        <div>
          <span class="label">Avg Level Indicator</span>
          <span class="value">{{ stats().avgLevelIndicator | number:'1.0-2' }}</span>
        </div>
      </div>

      <div class="quick-add-section">
        <h3 class="quick-add-title">Add New Record</h3>
        <div class="quick-add-form">
          <div class="quick-add-grid">
            <label>
              <span>Date</span>
              <input type="date" [formControl]="quickAddControls.date" />
            </label>
            <label>
              <span>Plant</span>
              <input type="text" [formControl]="quickAddControls.plant" placeholder="Plant" />
            </label>
            <label>
              <span>Product</span>
              <input type="text" [formControl]="quickAddControls.product" placeholder="Product" />
            </label>
            <label>
              <span>Campaign</span>
              <input type="text" [formControl]="quickAddControls.campaign" placeholder="Campaign" />
            </label>
            <label>
              <span>Stage</span>
              <input type="text" [formControl]="quickAddControls.stage" placeholder="Stage" />
            </label>
            <label>
              <span>Tank</span>
              <input type="text" [formControl]="quickAddControls.tank" placeholder="Tank" />
            </label>
            <label>
              <span>Level Indicator</span>
              <input type="text" [formControl]="quickAddControls.levelIndicator" placeholder="Level Indicator" />
            </label>
            <label>
              <span>Weight (lbs)</span>
              <input type="number" [formControl]="quickAddControls.weight" placeholder="Weight" step="any" />
            </label>
            <label>
              <span>Received (lbs)</span>
              <input type="number" [formControl]="quickAddControls.receivedAmount" placeholder="Received" step="any" />
            </label>
          </div>
          @if (quickSaveError()) {
            <p class="quick-add-error">{{ quickSaveError() }}</p>
          }
          <div class="quick-add-actions">
            <button type="button" class="quick-save-btn" (click)="quickSave()" [disabled]="!canQuickSave()">
              @if (isQuickSaving()) {
                <span class="saving">⏳ Saving...</span>
              } @else {
                <span class="save-text">💾 Save Record</span>
              }
            </button>
            <button type="button" class="quick-clear-btn" (click)="resetQuickAddForm()" [disabled]="isQuickSaving()">
              🗑️ Clear
            </button>
          </div>
        </div>
      </div>

      @if (!isLoading()) {
        <div class="table-wrapper" [class.dimmed]="editingRow()">
          <table>
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
              </tr>
            </thead>
            <tbody>
              @for (row of rows(); track row._id || $index) {
                <tr class="data-row">
                  <td>{{ row.date | date:'yyyy-MM-dd' }}</td>
                  <td>{{ row.plant }}</td>
                  <td>{{ row.product }}</td>
                  <td>{{ row.campaign }}</td>
                  <td>{{ row.stage }}</td>
                  <td>{{ row.tank }}</td>
                  <td>{{ row.levelIndicator }}</td>
                  <td>{{ resolveNumber(row.weightLbs, row.weight) | number:'1.0-2' }}</td>
                  <td class="row-actions">
                    <span>{{ resolveNumber(row.receivedAmountLbs, row.receivedAmount) | number:'1.0-2' }}</span>
                    <button type="button" class="row-edit-button" (click)="openEditModal(row)">Edit</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="empty">No fermentation records match the selected filters.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="loading">Loading fermentation data...</div>
      }

      @if (editingRow()) {
        <div class="modal-backdrop">
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
            <header class="modal-header">
              <h2 id="edit-modal-title">Edit Fermentation Record</h2>
              <button type="button" class="modal-close" (click)="closeEditModal()" aria-label="Close">&times;</button>
            </header>
            <form class="modal-form" [formGroup]="editForm" (ngSubmit)="submitEdit()">
              <div class="modal-grid">
                @for (field of modalFields; track field.key) {
                  <label [attr.for]="'field-' + field.key">
                    <span>{{ field.label }}</span>
                    <input
                      [id]="'field-' + field.key"
                      [type]="field.type"
                      [formControlName]="field.key"
                      [attr.placeholder]="field.label"
                    />
                  </label>
                }
              </div>
              @if (mutationError()) {
                <p class="modal-error">{{ mutationError() }}</p>
              }
              <div class="modal-actions">
                <button type="submit" class="btn-primary" [disabled]="!canSubmitEdit()">Save</button>
                <button type="button" class="btn-danger" (click)="deleteCurrentRow()" [disabled]="!canDelete()">Delete Row</button>
                <button type="button" class="btn-secondary" (click)="closeEditModal()" [disabled]="isMutating()">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .pov {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
        background: #f8fafc;
        border-radius: 0.75rem;
        position: relative;
      }
      .filters {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        align-items: end;
      }
      .filters label {
        display: flex;
        flex-direction: column;
        font-size: 0.85rem;
        color: #1e293b;
      }
      .filters input {
        margin-top: 0.25rem;
        padding: 0.45rem 0.6rem;
        border-radius: 0.5rem;
        border: 1px solid #cbd5e1;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
      }
      .actions button {
        padding: 0.5rem 0.9rem;
        border-radius: 999px;
        border: none;
        cursor: pointer;
        background: #1d4ed8;
        color: #fff;
      }
      .actions button[type='button'] {
        background: #475569;
      }
      .summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 1rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
      }
      .summary .label {
        display: block;
        font-size: 0.75rem;
        color: #475569;
      }
      .summary .value {
        font-size: 1.05rem;
        font-weight: 600;
        color: #0f172a;
      }
      .manual-entry {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .manual-entry-toggle {
        align-self: flex-start;
        border: none;
        border-radius: 999px;
        padding: 0.45rem 1.1rem;
        background: #1d4ed8;
        color: #fff;
        cursor: pointer;
        font-size: 0.85rem;
        transition: background 0.2s ease;
      }
      .manual-entry-toggle:hover {
        background: #1e40af;
      }
      .manual-entry-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .manual-entry-grid {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
      .manual-entry-grid label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.8rem;
        color: #1e293b;
      }
      .manual-entry-grid input {
        padding: 0.5rem 0.65rem;
        border-radius: 0.6rem;
        border: 1px solid #cbd5e1;
        font-size: 0.85rem;
      }
      .manual-entry-error {
        margin: 0;
        color: #b91c1c;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .manual-entry-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }
      .manual-entry-actions button {
        border: none;
        border-radius: 999px;
        padding: 0.5rem 1.1rem;
        font-size: 0.85rem;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;
      }
      .manual-entry-cancel {
        background: #e2e8f0;
        color: #0f172a;
      }
      .manual-entry-cancel:hover {
        background: #cbd5f5;
      }
      .manual-entry-save {
        background: #2563eb;
        color: #fff;
      }
      .manual-entry-save:hover {
        background: #1d4ed8;
      }
      .manual-entry-save:disabled,
      .manual-entry-cancel:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      .table-wrapper {
        position: relative;
        padding-right: 3rem;
        background: #fff;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0;
        transition: opacity 0.2s ease;
      }
      .table-wrapper.dimmed {
        opacity: 0.4;
        pointer-events: none;
      }
      table {
        position: relative;
        width: 100%;
        border-collapse: collapse;
      }
      thead {
        position: relative;
      }
      thead::after {
        content: '';
        position: absolute;
        top: 0;
        right: -3rem;
        width: 3rem;
        height: 100%;
        background: #f1f5f9;
        border-top-right-radius: 0.75rem;
      }
      tbody tr.data-row {
        position: relative;
      }
      tbody tr.data-row::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: -3rem;
        bottom: -1px;
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
        pointer-events: auto;
        transition: background 0.18s ease, border-color 0.18s ease;
        z-index: 0;
      }
      tbody tr.data-row:hover::after {
        background: linear-gradient(90deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.06) 55%, rgba(59, 130, 246, 0.12));
        border-bottom-color: #bfdbfe;
      }
      tbody tr.data-row td {
        position: relative;
        z-index: 1;
        border-bottom: none;
        background: transparent;
      }
      tbody tr.data-row td.row-actions {
        position: relative;
        padding-right: 3rem;
        white-space: nowrap;
      }
      tbody tr.data-row td.row-actions span {
        display: inline-block;
        padding-right: 1rem;
      }
      .row-edit-button {
        position: absolute;
        top: 50%;
        right: 0;
        transform: translate(2.4rem, -50%);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease, transform 0.18s ease;
        padding: 0.3rem 0.85rem;
        font-size: 0.75rem;
        border-radius: 9999px;
        border: 1px solid #bfdbfe;
        background: linear-gradient(120deg, #eef2ff, #dbeafe);
        color: #1d4ed8;
        box-shadow: 0 4px 10px rgba(59, 130, 246, 0.16);
        z-index: 2;
      }
      .row-edit-button:hover {
        background: linear-gradient(120deg, #dbeafe, #bfdbfe);
      }
      tbody tr.data-row:hover .row-edit-button,
      tbody tr.data-row td.row-actions:hover .row-edit-button,
      .table-wrapper.dimmed .row-edit-button {
        opacity: 1;
        pointer-events: auto;
        transform: translate(2.05rem, -50%);
      }
      th,
      td {
        padding: 0.65rem;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
        font-size: 0.85rem;
      }
      th {
        background: #f1f5f9;
        font-weight: 600;
        color: #1e293b;
      }
      .empty {
        text-align: center;
        color: #64748b;
        font-style: italic;
      }
      .quick-add-section {
        background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
        border: 2px solid #0ea5e9;
        border-radius: 0.75rem;
        padding: 1.25rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
      }
      .quick-add-title {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        color: #0f172a;
        font-weight: 600;
      }
      .quick-add-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .quick-add-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }
      .quick-add-grid label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.85rem;
        color: #1e293b;
        font-weight: 500;
      }
      .quick-add-grid input {
        padding: 0.55rem 0.7rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        font-size: 0.85rem;
        background: white;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .quick-add-grid input:focus {
        outline: none;
        border-color: #0ea5e9;
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
      }
      .quick-add-grid input:invalid:not(:focus):not(:placeholder-shown) {
        border-color: #ef4444;
      }
      .quick-add-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        align-items: center;
      }
      .quick-save-btn {
        padding: 0.6rem 1.2rem;
        border: none;
        border-radius: 0.5rem;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 600;
        transition: all 0.2s ease;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .quick-save-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #059669, #047857);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      }
      .quick-save-btn:disabled {
        background: #9ca3af;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
      .quick-clear-btn {
        padding: 0.6rem 1rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        background: white;
        color: #6b7280;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s ease;
      }
      .quick-clear-btn:hover:not(:disabled) {
        background: #f9fafb;
        border-color: #9ca3af;
        color: #374151;
      }
      .quick-clear-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .quick-add-error {
        margin: 0;
        color: #dc2626;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .saving {
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      .loading {
        padding: 2rem;
        text-align: center;
        color: #475569;
        background: #fff;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        z-index: 1000;
      }
      .modal {
        width: min(560px, 100%);
        max-height: calc(100vh - 3rem);
        background: #ffffff;
        border-radius: 1rem;
        box-shadow: 0 25px 65px rgba(15, 23, 42, 0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid #e2e8f0;
      }
      .modal-header h2 {
        margin: 0;
        font-size: 1.1rem;
        color: #0f172a;
      }
      .modal-close {
        border: none;
        background: transparent;
        font-size: 1.5rem;
        cursor: pointer;
        color: #475569;
        line-height: 1;
      }
      .modal-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
        padding: 1.25rem;
        overflow-y: auto;
      }
      .modal-grid {
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
      .modal-grid label {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        font-size: 0.85rem;
        color: #1e293b;
      }
      .modal-grid input {
        padding: 0.55rem 0.7rem;
        border-radius: 0.6rem;
        border: 1px solid #cbd5e1;
        font-size: 0.85rem;
      }
      .modal-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: flex-end;
      }
      .modal-actions button {
        border: none;
        border-radius: 999px;
        padding: 0.55rem 1.2rem;
        font-size: 0.9rem;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;
      }
      .modal-actions .btn-primary {
        background: #2563eb;
        color: #ffffff;
      }
      .modal-actions .btn-primary:hover {
        background: #1d4ed8;
      }
      .modal-actions .btn-danger {
        background: #fee2e2;
        color: #b91c1c;
      }
      .modal-actions .btn-danger:hover {
        background: #fecaca;
      }
      .modal-actions .btn-secondary {
        background: #e2e8f0;
        color: #0f172a;
      }
      .modal-actions .btn-secondary:hover {
        background: #cbd5f5;
      }
      @media (max-width: 640px) {
        .modal {
          max-height: calc(100vh - 2rem);
        }
        .modal-actions {
          justify-content: center;
        }
        .table-wrapper {
          padding-right: 0;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          position: relative;
          border-radius: 0.75rem;
          box-shadow: inset -10px 0 10px -10px rgba(0, 0, 0, 0.1);
          margin-bottom: 1.5rem;
        }
        .table-wrapper::after {
          content: '← Scroll to see more →';
          position: sticky;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(59, 130, 246, 0.9);
          color: white;
          padding: 0.25rem 0.5rem;
          font-size: 0.65rem;
          border-radius: 0.375rem;
          pointer-events: none;
          z-index: 3;
          margin-top: 0.5rem;
          display: block;
          width: fit-content;
          margin-left: auto;
          margin-right: auto;
        }
        table {
          min-width: 800px;
          width: 800px;
        }
        th, td {
          padding: 0.4rem 0.25rem;
          font-size: 0.7rem;
          white-space: nowrap;
          border-right: 1px solid #e2e8f0;
        }
        th:last-child, td:last-child {
          border-right: none;
        }
        th:first-child, td:first-child {
          min-width: 80px;
          width: 80px;
          position: sticky;
          left: 0;
          background: #f1f5f9;
          z-index: 2;
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.1);
        }
        tbody tr.data-row td:first-child {
          background: #fff;
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
        }
        th:nth-child(2), td:nth-child(2) {
          min-width: 60px;
          width: 60px;
        }
        th:nth-child(3), td:nth-child(3) {
          min-width: 70px;
          width: 70px;
        }
        th:nth-child(4), td:nth-child(4) {
          min-width: 80px;
          width: 80px;
        }
        th:nth-child(5), td:nth-child(5) {
          min-width: 60px;
          width: 60px;
        }
        th:nth-child(6), td:nth-child(6) {
          min-width: 60px;
          width: 60px;
        }
        th:nth-child(7), td:nth-child(7) {
          min-width: 80px;
          width: 80px;
        }
        th:nth-child(8), td:nth-child(8) {
          min-width: 80px;
          width: 80px;
        }
        th:nth-child(9), td:nth-child(9) {
          min-width: 120px;
          width: 120px;
        }
        thead::after {
          display: none;
        }
        tbody tr.data-row::after {
          right: 0;
        }
        tbody tr.data-row td.row-actions {
          padding-right: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        tbody tr.data-row td.row-actions span {
          padding-right: 0.3rem;
          flex-shrink: 0;
        }
        .row-edit-button {
          position: static;
          transform: none;
          opacity: 1;
          pointer-events: auto;
          margin-left: 0.25rem;
          font-size: 0.6rem;
          padding: 0.15rem 0.3rem;
          white-space: nowrap;
          flex-shrink: 0;
          border-radius: 4px;
        }
        tbody tr.data-row:hover .row-edit-button,
        tbody tr.data-row td.row-actions:hover .row-edit-button,
        .table-wrapper.dimmed .row-edit-button {
          transform: none;
        }
        .quick-add-section {
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .quick-add-grid {
          grid-template-columns: 1fr;
          gap: 0.75rem;
        }
        .quick-add-actions {
          flex-direction: column-reverse;
          gap: 0.5rem;
        }
        .quick-save-btn,
        .quick-clear-btn {
          width: 100%;
          justify-content: center;
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

