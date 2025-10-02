import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  });

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
    const raw = this.editForm.getRawValue();
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
      plant: raw.plant ?? '',
      product: raw.product ?? '',
      campaign: raw.campaign ?? '',
      stage: raw.stage ?? '',
      tank: raw.tank ?? '',
      levelIndicator: raw.levelIndicator ?? '',
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

