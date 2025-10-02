import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { ApiService, DataFilters, ExtractionRequest, ExtractionResponse } from '../../core/services/api.service';

type ModalFieldKey =
  | 'date'
  | 'plant'
  | 'product'
  | 'campaign'
  | 'stage'
  | 'tank'
  | 'concentration'
  | 'volume'
  | 'weight'
  | 'levelIndicator'
  | 'pH';

type ModalRow = Partial<Record<ModalFieldKey, unknown>> & { _id?: string };

interface ModalField {
  key: ModalFieldKey;
  label: string;
  type: 'text' | 'number' | 'date';
}


@Component({
  selector: 'app-extraction-dashboard',
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
          <span>Campaign</span>
          <input type="text" formControlName="campaign" placeholder="Campaign" />
        </label>
        <label>
          <span>Stage</span>
          <input type="text" formControlName="stage" placeholder="Stage" />
        </label>
        <div class="actions">
          <button type="submit">Apply</button>
          <button type="button" (click)="resetFilters()">Reset</button>
        </div>
      </form>

      <div class="summary">
        <div>
          <span class="label">Avg Concentration (g/l)</span>
          <span class="value">{{ stats().avgConcentration | number:'1.0-2' }}</span>
        </div>
        <div>
          <span class="label">Total Volume (gal)</span>
          <span class="value">{{ stats().totalVolume | number:'1.0-2' }}</span>
        </div>
        <div>
          <span class="label">Total Weight (kg)</span>
          <span class="value">{{ stats().totalWeight | number:'1.0-2' }}</span>
        </div>
        <div>
          <span class="label">Avg pH</span>
          <span class="value">{{ stats().avgPh | number:'1.0-2' }}</span>
        </div>
      </div>

      <div class="table-wrapper" [class.dimmed]="editingRow()" *ngIf="!isLoading(); else loading">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Plant</th>
              <th>Product</th>
              <th>Campaign</th>
              <th>Stage</th>
              <th>Tank</th>
              <th>Concentration (g/l)</th>
              <th>Volume (gal)</th>
              <th>Weight (kg)</th>
              <th>Level Indicator</th>
              <th>pH</th>
            </tr>
          </thead>
          <tbody>
            <tr class="data-row" *ngFor="let row of rows()">
              <td>{{ row.date | date:'yyyy-MM-dd' }}</td>
              <td>{{ row.plant }}</td>
              <td>{{ row.product }}</td>
              <td>{{ row.campaign }}</td>
              <td>{{ row.stage }}</td>
              <td>{{ row.tank }}</td>
              <td>{{ row.concentration | number:'1.0-2' }}</td>
              <td>{{ row.volume | number:'1.0-2' }}</td>
              <td>{{ row.weight | number:'1.0-2' }}</td>
              <td>{{ row.levelIndicator }}</td>
              <td class="row-actions">
                <span>{{ row.pH | number:'1.0-2' }}</span>
                <button type="button" class="row-edit-button" (click)="openEditModal(row)">Edit</button>
              </td>
            </tr>
            <tr *ngIf="!rows().length">
              <td colspan="11" class="empty">No extraction records match the selected filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #loading>
        <div class="loading">Loading extraction data...</div>
      </ng-template>

      <div class="modal-backdrop" *ngIf="editingRow()">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
          <header class="modal-header">
            <h2 id="edit-modal-title">Edit Extraction Record</h2>
            <button type="button" class="modal-close" (click)="closeEditModal()" aria-label="Close">&times;</button>
          </header>
          <form class="modal-form" [formGroup]="editForm" (ngSubmit)="submitEdit()">
            <div class="modal-grid">
              <label *ngFor="let field of modalFields" [attr.for]="'field-' + field.key">
                <span>{{ field.label }}</span>
                <input
                  [id]="'field-' + field.key"
                  [type]="field.type"
                  [formControlName]="field.key"
                  [attr.placeholder]="field.label"
                />
              </label>
            </div>
            <p class="modal-error" *ngIf="mutationError()">{{ mutationError() }}</p>
            <div class="modal-actions">
              <button type="submit" class="btn-primary" [disabled]="isMutating() || editForm.invalid">Save</button>
              <button type="button" class="btn-danger" (click)="deleteCurrentRow()" [disabled]="isMutating()">Delete Row</button>
              <button type="button" class="btn-secondary" (click)="closeEditModal()" [disabled]="isMutating()">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `,
  styles: [
    `      .pov {
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
      }
      .table-wrapper.dimmed {
        opacity: 0.4;
        pointer-events: none;
      }
      .table-wrapper.dimmed .row-edit-button {
        opacity: 1;
        pointer-events: auto;
        transform: translate(2.05rem, -50%);
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
      tbody tr.data-row td.row-actions:hover .row-edit-button {
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
      .modal-error {
        margin: 0.25rem 0 0;
        color: #b91c1c;
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
export class ExtractionDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterForm = this.fb.nonNullable.group({
    date: '',
    plant: '',
    product: '',
    campaign: '',
    stage: ''
  });

  protected readonly rows = signal<ExtractionResponse[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly editingRow = signal<ModalRow | null>(null);

  protected readonly editForm = this.fb.group({
    date: ['', Validators.required],
    plant: ['', Validators.required],
    product: ['', Validators.required],
    campaign: ['', Validators.required],
    stage: ['', Validators.required],
    tank: ['', Validators.required],
    concentration: [null as number | null, [Validators.required, Validators.min(0.0000001)]],
    volume: [null as number | null, [Validators.required, Validators.min(0.0000001)]],
    weight: [null as number | null, [Validators.required, Validators.min(0.0000001)]],
    levelIndicator: ['', Validators.required],
    pH: [null as number | null, [Validators.required, Validators.min(0), Validators.max(14)]]
  });

  protected readonly isMutating = signal(false);
  protected readonly mutationError = signal<string | null>(null);

  protected readonly modalFields: ModalField[] = [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'plant', label: 'Plant', type: 'text' },
    { key: 'product', label: 'Product', type: 'text' },
    { key: 'campaign', label: 'Campaign', type: 'text' },
    { key: 'stage', label: 'Stage', type: 'text' },
    { key: 'tank', label: 'Tank', type: 'text' },
    { key: 'concentration', label: 'Concentration (g/l)', type: 'number' },
    { key: 'volume', label: 'Volume (gal)', type: 'number' },
    { key: 'weight', label: 'Weight (kg)', type: 'number' },
    { key: 'levelIndicator', label: 'Level Indicator', type: 'text' },
    { key: 'pH', label: 'pH', type: 'number' }
  ];


  protected readonly stats = computed(() => {
    const data = this.rows();
    if (!data.length) {
      return {
        avgConcentration: 0,
        totalVolume: 0,
        totalWeight: 0,
        avgPh: 0
      };
    }

    const totals = data.reduce(
      (acc, item) => {
        acc.sumConcentration += item.concentration ?? 0;
        if (item.concentration !== undefined && item.concentration !== null) {
          acc.countConcentration += 1;
        }
        acc.totalVolume += item.volume ?? 0;
        acc.totalWeight += item.weight ?? 0;
        if (item.pH !== undefined && item.pH !== null) {
          acc.sumPh += item.pH;
          acc.countPh += 1;
        }
        return acc;
      },
      { sumConcentration: 0, countConcentration: 0, totalVolume: 0, totalWeight: 0, sumPh: 0, countPh: 0 }
    );

    return {
      avgConcentration: totals.countConcentration ? totals.sumConcentration / totals.countConcentration : 0,
      totalVolume: totals.totalVolume,
      totalWeight: totals.totalWeight,
      avgPh: totals.countPh ? totals.sumPh / totals.countPh : 0
    };
  });

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData());

    this.loadData();
  }

  protected onSubmit(): void {
    this.loadData();
  }

  protected resetFilters(): void {
    this.filterForm.reset({ date: '', plant: '', product: '', campaign: '', stage: '' });
    this.loadData();
  }

  protected openEditModal(row: ExtractionResponse): void {
    this.mutationError.set(null);
    this.isMutating.set(false);

    this.editForm.reset({
      date: this.normalizeDateValue(row.date),
      plant: row.plant ?? '',
      product: row.product ?? '',
      campaign: row.campaign ?? '',
      stage: row.stage ?? '',
      tank: row.tank ?? '',
      concentration: this.coerceNumber(row.concentration),
      volume: this.coerceNumber(row.volume),
      weight: this.coerceNumber(row.weight),
      levelIndicator: row.levelIndicator ?? '',
      pH: this.coerceNumber(row.pH)
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
      console.warn('Attempted to save extraction without an identifier.');
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    let payload: ExtractionRequest;
    try {
      payload = this.buildExtractionPayload();
    } catch (err) {
      this.mutationError.set('Unable to prepare extraction payload.');
      return;
    }

    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .updateExtraction(current._id, payload)
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
          console.error('Failed to update extraction record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to update extraction record.');
        }
      });
  }

  protected deleteCurrentRow(): void {
    const current = this.editingRow();

    if (!current?._id) {
      console.warn('Attempted to delete extraction without an identifier.');
      return;
    }

    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .deleteExtraction(current._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.rows.update((rows) => rows.filter((item) => item._id !== current._id));
          this.isMutating.set(false);
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Failed to delete extraction record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to delete extraction record.');
        }
      });
  }

  private buildExtractionPayload(): ExtractionRequest {
    const raw = this.editForm.getRawValue();
    const dateValue = raw.date ?? '';
    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date provided');
    }

    return {
      date: parsedDate.toISOString(),
      plant: raw.plant ?? '',
      product: raw.product ?? '',
      campaign: raw.campaign ?? '',
      stage: raw.stage ?? '',
      tank: raw.tank ?? '',
      concentration: Number(raw.concentration),
      volume: Number(raw.volume),
      weight: Number(raw.weight),
      levelIndicator: raw.levelIndicator ?? '',
      pH: Number(raw.pH)
    };
  }

  private normalizeDateValue(value: ModalRow['date']): string {
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

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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

    // TODO: replace stub once extraction endpoint is available
    this.apiService
      .getExtractionData(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.rows.set(Array.isArray(data) ? data : []);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load extraction data', err);
          this.rows.set([]);
          this.isLoading.set(false);
        }
      });
  }
}
