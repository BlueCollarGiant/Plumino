import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { ApiService, DataFilters, FermentationResponse } from '../../core/services/api.service';

@Component({
  selector: 'app-fermentation-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="pov">
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

      <div class="table-wrapper" *ngIf="!isLoading(); else loading">
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
            <tr *ngFor="let row of rows()">
              <td>{{ row.date | date:'yyyy-MM-dd' }}</td>
              <td>{{ row.plant }}</td>
              <td>{{ row.product }}</td>
              <td>{{ row.campaign }}</td>
              <td>{{ row.stage }}</td>
              <td>{{ row.tank }}</td>
              <td>{{ row.levelIndicator }}</td>
              <td>{{ resolveNumber(row.weightLbs, row.weight) | number:'1.0-2' }}</td>
              <td>{{ resolveNumber(row.receivedAmountLbs, row.receivedAmount) | number:'1.0-2' }}</td>
            </tr>
            <tr *ngIf="!rows().length">
              <td colspan="9" class="empty">No fermentation records match the selected filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #loading>
        <div class="loading">Loading fermentation data…</div>
      </ng-template>
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
        overflow-x: auto;
        background: #fff;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0;
      }
      table {
        width: 100%;
        border-collapse: collapse;
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
    `
  ]
})
export class FermentationDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterForm = this.fb.nonNullable.group({
    date: '',
    plant: '',
    product: '',
    campaign: ''
  });

  protected readonly rows = signal<FermentationResponse[]>([]);
  protected readonly isLoading = signal(false);

  protected readonly stats = computed(() => {
    const data = this.rows();
    if (!data.length) {
      return {
        totalWeight: 0,
        totalReceived: 0,
        avgLevelIndicator: 0
      };
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
    this.filterForm.reset({ date: '', plant: '', product: '', campaign: '' });
    this.loadData();
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

    // TODO: replace stub once fermentation endpoint is available
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
