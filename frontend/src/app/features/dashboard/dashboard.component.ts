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

type TimeRangeValue = '7d' | '1m' | '6m' | '1y' | 'all';

interface RangeOption {
  label: string;
  value: TimeRangeValue;
}

const RANGE_OPTIONS: RangeOption[] = [
  { label: '7 Days', value: '7d' },
  { label: '1 Month', value: '1m' },
  { label: '6 Months', value: '6m' },
  { label: '1 Year', value: '1y' },
  { label: 'All', value: 'all' }
];

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

      <div class="range-controls">
        <span class="range-label">Time Range</span>
        <div class="range-buttons">
          <button
            type="button"
            *ngFor="let option of rangeOptions; trackBy: trackByRange"
            (click)="setRange(option.value)"
            [class.active]="selectedRange() === option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>

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

      .range-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }

      .range-label {
        font-size: 0.85rem;
        font-weight: 600;
        color: #1e293b;
      }

      .range-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }

      .range-buttons button {
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #0f172a;
        cursor: pointer;
        font-size: 0.8rem;
      }

      .range-buttons button.active {
        border-color: #1d4ed8;
        background: rgba(29, 78, 216, 0.12);
        color: #1d4ed8;
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

  private readonly defaultRange: TimeRangeValue = '6m';
  protected readonly rangeOptions = RANGE_OPTIONS;
  protected readonly selectedRange = signal<TimeRangeValue>(this.defaultRange);
  protected readonly currentFilters = signal<PackagingFilters>({ range: this.defaultRange });
  protected readonly trackByRange = (_: number, option: RangeOption) => option.value;

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
    this.selectedRange.set(this.defaultRange);
    this.loadFromForm(); // immediately refresh results after reset
  }

  protected changeView(view: ViewKey): void {
    if (this.activeView() === view) {
      return;
    }
    this.activeView.set(view);
    this.loadStats(view, this.currentFilters()); // re-run aggregates with current filters
  }

  private loadFromForm(): void {
    const filters = this.buildFiltersFromForm();
    this.currentFilters.set(filters);
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

    const range = this.selectedRange();
    if (range && range !== 'all') {
      filters.range = range;
    }

    return filters;
  }

  protected setRange(range: TimeRangeValue): void {
    if (this.selectedRange() === range) {
      return;
    }
    this.selectedRange.set(range);
    this.loadFromForm();
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
    if (!records.length) {
      this.chartConfig.set({
        type: 'bar',
        data: { labels: [] as string[], datasets: [] },
        options: this.buildBarOptions(true)
      });
      return;
    }

    if (view === 'product') {
      const labels = records.map((item) => this.normalizeLabel(item._id as string));
      const outgoing = records.map((item) => item.outgoingTotal ?? 0);
      const colors = this.generateColors(labels.length).map((hex) => this.hexToRgba(hex, 0.85));

      this.chartConfig.set({
        type: 'pie',
        data: {
          labels,
          datasets: [
            {
              label: 'Outgoing (kg)',
              data: outgoing,
              backgroundColor: colors
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: 'bottom' } }
        }
      });
      return;
    }

    if (view === 'campaign') {
      const firstId = records[0]._id;
      if (typeof firstId === 'string') {
        const labels = records.map((item) => this.normalizeLabel(item._id as string));
        const outgoing = records.map((item) => item.outgoingTotal ?? 0);
        const incoming = records.map((item) => item.incomingTotal ?? 0);

        this.chartConfig.set({
          type: 'bar',
          data: {
            labels,
            datasets: [
              this.buildBarDataset('Outgoing (kg)', outgoing, '#3b82f6'),
              this.buildBarDataset('Incoming (kg)', incoming, '#22c55e')
            ]
          },
          options: this.buildBarOptions(true)
        });
        return;
      }

      const timeline = this.buildCampaignTimeline(records);
      this.chartConfig.set({
        type: 'line',
        data: timeline,
        options: this.buildLineOptions()
      });
      return;
    }

    if (view === 'date') {
      const labels = records.map((item) => this.normalizeLabel(item._id as string));
      const outgoing = records.map((item) => item.outgoingTotal ?? 0);
      const incoming = records.map((item) => item.incomingTotal ?? 0);

      this.chartConfig.set({
        type: 'line',
        data: {
          labels,
          datasets: [
            this.buildLineDataset('Outgoing (kg)', outgoing, '#3b82f6', {
              fill: true,
              backgroundAlpha: 0.25
            }),
            this.buildLineDataset('Incoming (kg)', incoming, '#22c55e', {
              fill: true,
              backgroundAlpha: 0.2,
              dash: true
            })
          ]
        },
        options: this.buildLineOptions()
      });
      return;
    }

    const labels = records.map((item) => this.normalizeLabel(item._id as string));
    const outgoing = records.map((item) => item.outgoingTotal ?? 0);
    const incoming = records.map((item) => item.incomingTotal ?? 0);

    this.chartConfig.set({
      type: 'bar',
      data: {
        labels,
        datasets: [
          this.buildBarDataset('Outgoing (kg)', outgoing, '#3b82f6'),
          this.buildBarDataset('Incoming (kg)', incoming, '#22c55e')
        ]
      },
      options: this.buildBarOptions(true)
    });
  }

  private buildCampaignTimeline(records: PackagingAggregate[]): ChartConfiguration['data'] {
    const dateSet = new Set<string>();
    const seriesMap = new Map<
      string,
      {
        outgoing: Map<string, number>;
        incoming: Map<string, number>;
        outgoingTotal: number;
      }
    >();

    records.forEach((record) => {
      if (!record._id || typeof record._id === 'string') {
        return;
      }

      const campaign = this.normalizeLabel(record._id.campaign ?? 'Unspecified');
      const date = record._id.date ?? 'Unknown';

      dateSet.add(date);

      const existing = seriesMap.get(campaign) ?? {
        outgoing: new Map<string, number>(),
        incoming: new Map<string, number>(),
        outgoingTotal: 0
      };

      existing.outgoing.set(date, record.outgoingTotal ?? 0);
      existing.incoming.set(date, record.incomingTotal ?? 0);
      existing.outgoingTotal += record.outgoingTotal ?? 0;

      seriesMap.set(campaign, existing);
    });

    const labels = Array.from(dateSet).sort();
    if (!labels.length) {
      return { labels: [], datasets: [] };
    }

    const sortedCampaigns = Array.from(seriesMap.entries())
      .sort((a, b) => b[1].outgoingTotal - a[1].outgoingTotal)
      .slice(0, 5); // limit to top 5 campaigns to keep the chart readable

    const datasets: ChartConfiguration['data']['datasets'] = [];

    sortedCampaigns.forEach(([campaign, series], index) => {
      const color = this.pickColor(index);
      datasets.push(
        this.buildLineDataset(
          `${campaign} Outgoing`,
          labels.map((date) => series.outgoing.get(date) ?? 0),
          color
        )
      );
      datasets.push(
        this.buildLineDataset(
          `${campaign} Incoming`,
          labels.map((date) => series.incoming.get(date) ?? 0),
          color,
          { dash: true, backgroundAlpha: 0.1 }
        )
      );
    });

    return { labels, datasets };
  }

  private normalizeLabel(value: string | null | undefined): string {
    return value && value.trim() ? value : 'Unspecified';
  }

  private generateColors(size: number): string[] {
    return Array.from({ length: size }, (_, index) => this.pickColor(index));
  }

  private buildBarDataset(label: string, data: number[], color: string) {
    return {
      label,
      data,
      backgroundColor: this.hexToRgba(color, 0.6),
      borderColor: color,
      borderWidth: 1
    };
  }

  private buildBarOptions(showLegend = true): ChartConfiguration['options'] {
    return {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { display: showLegend, position: 'bottom' }
      }
    };
  }

  private buildLineDataset(
    label: string,
    data: number[],
    color: string,
    options: { fill?: boolean; dash?: boolean; backgroundAlpha?: number } = {}
  ) {
    const { fill = false, dash = false, backgroundAlpha = fill ? 0.3 : 0.15 } = options;
    const dataset: any = {
      label,
      data,
      borderColor: color,
      backgroundColor: this.hexToRgba(color, backgroundAlpha),
      fill,
      tension: 0.3
    };

    if (dash) {
      dataset.borderDash = [6, 3];
    }

    return dataset;
  }

  private buildLineOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      },
      plugins: {
        legend: { position: 'bottom' }
      }
    };
  }

  private pickColor(index: number): string {
    return this.colorPalette[index % this.colorPalette.length];
  }

  private hexToRgba(hex: string, alpha = 1): string {
    let sanitized = hex.replace('#', '');
    if (sanitized.length === 3) {
      sanitized = sanitized
        .split('')
        .map((char) => char + char)
        .join('');
    }

    const r = parseInt(sanitized.substring(0, 2), 16);
    const g = parseInt(sanitized.substring(2, 4), 16);
    const b = parseInt(sanitized.substring(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
