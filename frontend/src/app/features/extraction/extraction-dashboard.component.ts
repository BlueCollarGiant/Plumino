import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { ApiService, DataFilters, ExtractionResponse } from '../../core/services/api.service';

@Component({
  selector: 'app-extraction-dashboard',
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
              <th>Concentration (g/l)</th>
              <th>Volume (gal)</th>
              <th>Weight (kg)</th>
              <th>Level Indicator</th>
              <th>pH</th>
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
              <td>{{ row.concentration | number:'1.0-2' }}</td>
              <td>{{ row.volume | number:'1.0-2' }}</td>
              <td>{{ row.weight | number:'1.0-2' }}</td>
              <td>{{ row.levelIndicator }}</td>
              <td>{{ row.pH | number:'1.0-2' }}</td>
            </tr>
            <tr *ngIf="!rows().length">
              <td colspan="11" class="empty">No extraction records match the selected filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ng-template #loading>
        <div class="loading">Loading extraction data…</div>
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
export class ExtractionDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterForm = this.fb.nonNullable.group({
    date: '',
    plant: '',
    product: '',
    campaign: ''
  });

  protected readonly rows = signal<ExtractionResponse[]>([]);
  protected readonly isLoading = signal(false);

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
    this.filterForm.reset({ date: '', plant: '', product: '', campaign: '' });
    this.loadData();
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
