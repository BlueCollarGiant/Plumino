import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import 'chart.js/auto'; // registers controllers/overlays so charts render without manual setup

import {
  ApiService,
  PackagingAggregate,
  PackagingFilters,
  PackagingResponse
} from '../../core/services/api.service';

type ViewKey = 'plant' | 'product' | 'campaign' | 'date';

type ChartState = {
  type: ChartType;
  data: ChartConfiguration['data'];
  options?: ChartConfiguration['options'];
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgChartsModule],
  template: `
    <section class="dashboard">
      <form [formGroup]="filterForm" (ngSubmit)="onSubmit()" class="filter-form">
        <div class="field-group">
          <label class="field">
            <span>Date</span>
            <input id="date" type="date" formControlName="date" />
          </label>
          <label class="field">
            <span>Plant</span>
            <input id="plant" type="text" formControlName="plant" placeholder="e.g. Plant A" />
          </label>
          <label class="field">
            <span>Product</span>
            <input id="product" type="text" formControlName="product" placeholder="e.g. Lysine" />
          </label>
          <label class="field">
            <span>Campaign</span>
            <input id="campaign" type="text" formControlName="campaign" placeholder="e.g. Q1" />
          </label>
        </div>

        <div class="actions">
          <button type="submit">Apply Filters</button>
          <button type="button" (click)="resetFilters()">Clear</button>
        </div>
      </form>

      <section class="chart-panel">
        <div class="chart-controls">
          <button
            type="button"
            (click)="changeView('plant')"
            [class.active]="activeView() === 'plant'"
          >
            View by Plant
          </button>
          <button
            type="button"
            (click)="changeView('product')"
            [class.active]="activeView() === 'product'"
          >
            View by Product
          </button>
          <button
            type="button"
            (click)="changeView('campaign')"
            [class.active]="activeView() === 'campaign'"
          >
            View by Campaign
          </button>
          <button
            type="button"
            (click)="changeView('date')"
            [class.active]="activeView() === 'date'"
          >
            View by Date
          </button>
        </div>

        <div class="chart-content">
          <div class="state" *ngIf="chartLoading()">Loading chart data...</div>

          <canvas
            *ngIf="!chartLoading() && chartHasData()"
            baseChart
            [type]="chartConfig().type"
            [data]="chartConfig().data"
            [options]="chartConfig().options"
          ></canvas>

          <div class="state" *ngIf="!chartLoading() && !chartHasData()">
            No aggregate data available.
          </div>
        </div>
      </section>

      <div class="state" *ngIf="isLoading()">Loading packaging data...</div>

      <table *ngIf="!isLoading() && packagingItems().length" class="results-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Plant</th>
            <th>Product</th>
            <th>Campaign</th>
            <th>Incoming (kg)</th>
            <th>Outgoing (kg)</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of packagingItems()">
            <td>{{ item.date | date: 'yyyy-MM-dd' }}</td>
            <td>{{ item.plant }}</td>
            <td>{{ item.product }}</td>
            <td>{{ item.campaign }}</td>
            <td>{{ item.incomingAmountKg }}</td>
            <td>{{ item.outgoingAmountKg }}</td>
          </tr>
        </tbody>
      </table>

      <div class="state" *ngIf="!isLoading() && !packagingItems().length">
        No packaging records match your filters.
      </div>
    </section>
  `,
  styles: [
    `
      .dashboard {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
      }

      .filter-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: #f7f7f7;
        border: 1px solid #e0e0e0;
        border-radius: 0.5rem;
        padding: 1rem;
      }

      .field-group {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.75rem;
      }

      .field {
        display: flex;
        flex-direction: column;
        font-size: 0.875rem;
        color: #333;
      }

      .field input {
        margin-top: 0.35rem;
        padding: 0.45rem 0.6rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.375rem;
        font-size: 0.95rem;
      }

      .actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-start;
      }

      .actions button {
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        border: none;
        cursor: pointer;
        background: #3b82f6;
        color: #fff;
      }

      .actions button[type='button'] {
        background: #64748b;
      }

      .chart-panel {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 1rem;
      }

      .chart-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .chart-controls button {
        padding: 0.4rem 0.9rem;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #0f172a;
        cursor: pointer;
        font-size: 0.85rem;
      }

      .chart-controls button.active {
        border-color: #2563eb;
        background: rgba(37, 99, 235, 0.12);
        color: #1d4ed8;
      }

      .chart-content {
        min-height: 240px;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      canvas {
        max-width: 100%;
      }

      .results-table {
        width: 100%;
        border-collapse: collapse;
      }

      .results-table th,
      .results-table td {
        border: 1px solid #e2e8f0;
        padding: 0.6rem;
        text-align: left;
      }

      .state {
        font-size: 0.95rem;
        color: #475569;
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  // Reactive form for collecting optional filters from the user
  protected readonly filterForm = this.fb.nonNullable.group({
    date: '',
    plant: '',
    product: '',
    campaign: '',
  });

  // Signal holds the latest packaging dataset rendered in the view
  protected readonly packagingItems = signal<PackagingResponse[]>([]);
  protected readonly isLoading = signal(false);

  // Chart state signals that back the ng2-charts canvas
  protected readonly activeView = signal<ViewKey>('plant');
  protected readonly chartLoading = signal(false);
  protected readonly chartConfig = signal<ChartState>({
    type: 'bar',
    data: { labels: [] as string[], datasets: [] },
    options: this.buildBarOptions()
  });
  protected readonly chartHasData = computed(() => {
    const labels = this.chartConfig().data.labels as string[] | undefined;
    return Array.isArray(labels) && labels.length > 0;
  });

  private readonly colorPalette = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ef4444', '#14b8a6', '#facc15'];

  ngOnInit(): void {
    this.loadFromForm();

    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadFromForm()); // re-fetch when any control changes
  }

  protected onSubmit(): void {
    this.loadFromForm(); // manual trigger when the user clicks Apply
  }

  protected resetFilters(): void {
    this.filterForm.setValue({ date: '', plant: '', product: '', campaign: '' });
    this.loadFromForm(); // immediately refresh results after reset
  }

  protected changeView(view: ViewKey): void {
    if (this.activeView() === view) {
      return;
    }
    this.activeView.set(view);
    this.loadStats(view, this.buildFiltersFromForm()); // re-run aggregates with current filters
  }

  private loadFromForm(): void {
    const filters = this.buildFiltersFromForm();
    this.loadPackaging(filters);
    this.loadStats(this.activeView(), filters);
  }

  private buildFiltersFromForm(): PackagingFilters {
    const raw = this.filterForm.value;
    const filters: PackagingFilters = {};

    Object.entries(raw).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        filters[key as keyof PackagingFilters] = value.trim(); // only include non-empty filters
      }
    });

    return filters;
  }

  private loadPackaging(filters: PackagingFilters): void {
    this.isLoading.set(true);

    this.apiService
      .getFilteredPackaging(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => {
          this.packagingItems.set(items);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load packaging data', err);
          this.packagingItems.set([]);
          this.isLoading.set(false);
        },
      }); // keeps the UI responsive while data loads
  }

  private loadStats(view: ViewKey, filters: PackagingFilters = {}): void {
    this.chartLoading.set(true);

    let source$;
    switch (view) {
      case 'product':
        source$ = this.apiService.getPackagingStatsByProduct(filters);
        break;
      case 'campaign':
        source$ = this.apiService.getPackagingStatsByCampaign(filters);
        break;
      case 'date':
        source$ = this.apiService.getPackagingStatsByDate(filters);
        break;
      default:
        source$ = this.apiService.getPackagingStatsByPlant(filters);
        break;
    }

    source$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (records) => {
          this.updateChartState(view, records);
          this.chartLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load packaging stats', err);
          this.chartConfig.set({
            type: 'bar',
            data: { labels: [] as string[], datasets: [] },
            options: this.buildBarOptions()
          });
          this.chartLoading.set(false);
        }
      });
  }

  private updateChartState(view: ViewKey, records: PackagingAggregate[]): void {
    const labels = records.map((item) => this.normalizeLabel(item._id));
    const totals = records.map((item) => item.total ?? 0);

    switch (view) {
      case 'product':
        this.chartConfig.set({
          type: 'pie',
          data: {
            labels,
            datasets: [
              {
                label: 'Outgoing (kg)',
                data: totals,
                backgroundColor: this.generateColors(labels.length)
              }
            ]
          },
          options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
          }
        });
        break;
      case 'campaign':
        this.chartConfig.set({
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Outgoing (kg)',
                data: totals,
                backgroundColor: this.generateColors(labels.length)
              }
            ]
          },
          options: this.buildBarOptions()
        });
        break;
      case 'date':
        this.chartConfig.set({
          type: 'line',
          data: {
            labels,
            datasets: [
              {
                label: 'Outgoing (kg)',
                data: totals,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.25)',
                fill: true,
                tension: 0.3
              }
            ]
          },
          options: {
            responsive: true,
            scales: {
              y: { beginAtZero: true }
            }
          }
        });
        break;
      default:
        this.chartConfig.set({
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: 'Outgoing (kg)',
                data: totals,
                backgroundColor: this.generateColors(labels.length)
              }
            ]
          },
          options: this.buildBarOptions()
        });
        break;
    }
  }

  private normalizeLabel(value: string | null | undefined): string {
    return value && value.trim() ? value : 'Unspecified';
  }

  private generateColors(size: number): string[] {
    return Array.from({ length: size }, (_, index) => this.colorPalette[index % this.colorPalette.length]);
  }

  private buildBarOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: false }
      }
    };
  }
}
