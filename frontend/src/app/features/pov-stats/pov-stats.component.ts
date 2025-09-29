import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartType } from 'chart.js';
import 'chart.js/auto';

import {
  ApiService,
  DataFilters,
  ExtractionResponse,
  FermentationResponse,
  PackagingFilters,
  PackagingResponse
} from '../../core/services/api.service';

type PovKey = 'packaging' | 'fermentation' | 'extraction';

type ChartState = {
  type: ChartType;
  data: ChartConfiguration['data'];
  options?: ChartConfiguration['options'];
};

interface StatsSummary {
  headline: string;
  metrics: { label: string; value: number; format?: string }[];
}

@Component({
  selector: 'app-pov-stats',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgChartsModule],
  template: `
    <section class="analytics">
      <header class="header">
        <h2>Point of View Analytics</h2>
        <p>Select a POV and adjust filters to visualize cross-process trends.</p>
      </header>

      <div class="pov-switcher">
        <button
          type="button"
          *ngFor="let option of povOptions"
          (click)="setPov(option.key)"
          [class.active]="selectedPov() === option.key"
        >
          {{ option.label }}
        </button>
      </div>

      <form [formGroup]="filterForm" (ngSubmit)="onSubmit()" class="filter-form">
        <div class="field-group">
          <label class="field">
            <span>Date</span>
            <input type="date" formControlName="date" />
          </label>
          <label class="field">
            <span>Plant</span>
            <input type="text" formControlName="plant" placeholder="Plant" />
          </label>
          <label class="field">
            <span>Product</span>
            <input type="text" formControlName="product" placeholder="Product" />
          </label>
          <label class="field">
            <span>Campaign</span>
            <input type="text" formControlName="campaign" placeholder="Campaign" />
          </label>
        </div>
        <div class="actions">
          <button type="submit">Apply</button>
          <button type="button" (click)="resetFilters()">Reset</button>
        </div>
      </form>

      <section class="chart-card">
        <h3>{{ chartTitle() }}</h3>
        <div class="chart-body">
          <canvas
            *ngIf="chartHasData(); else emptyChart"
            baseChart
            [type]="chartState().type"
            [data]="chartState().data"
            [options]="chartState().options"
          ></canvas>
          <ng-template #emptyChart>
            <div class="empty">No chartable data for the selected filters.</div>
          </ng-template>
        </div>
      </section>

      <section class="stats">
        <h3>{{ statsSummary().headline }}</h3>
        <div class="stat-grid">
          <div *ngFor="let metric of statsSummary().metrics" class="stat">
            <span class="label">{{ metric.label }}</span>
            <span class="value">{{ metric.value | number: metric.format ?? '1.0-2' }}</span>
          </div>
        </div>
      </section>

      <section class="data-table" *ngIf="rows().length; else noRows">
        <table>
          <thead>
            <tr>
              <th *ngFor="let column of tableColumns()">{{ column }}</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of rows()">
              <td *ngFor="let column of tableColumns()">{{ renderCell(row, column) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
      <ng-template #noRows>
        <div class="empty">No records match the selected filters for this POV.</div>
      </ng-template>
    </section>
  `,
  styles: [
    `
      .analytics {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 1.5rem;
        background: #f8fafc;
        border-radius: 0.75rem;
      }
      .header h2 {
        margin: 0;
        font-size: 1.75rem;
        color: #0f172a;
      }
      .header p {
        margin: 0.25rem 0 0;
        color: #475569;
      }
      .pov-switcher {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .pov-switcher button {
        padding: 0.45rem 0.9rem;
        border-radius: 999px;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #1e293b;
        cursor: pointer;
      }
      .pov-switcher button.active {
        background: rgba(56, 189, 248, 0.15);
        border-color: #38bdf8;
        color: #0369a1;
      }
      .filter-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        background: #fff;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0;
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
        font-size: 0.85rem;
        color: #1e293b;
      }
      .field input {
        margin-top: 0.35rem;
        padding: 0.45rem 0.6rem;
        border-radius: 0.5rem;
        border: 1px solid #cbd5e1;
      }
      .actions {
        display: flex;
        gap: 0.5rem;
      }
      .actions button {
        padding: 0.45rem 0.9rem;
        border-radius: 0.5rem;
        border: none;
        cursor: pointer;
        background: #1d4ed8;
        color: white;
      }
      .actions button[type='button'] {
        background: #475569;
      }
      .chart-card {
        background: #fff;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0;
        padding: 1rem;
      }
      .chart-card h3 {
        margin: 0 0 0.75rem;
        color: #0f172a;
      }
      .chart-body {
        min-height: 260px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .stats {
        background: #fff;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0;
        padding: 1rem;
      }
      .stat-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 0.75rem;
      }
      .stat {
        display: flex;
        flex-direction: column;
        background: #f1f5f9;
        border-radius: 0.5rem;
        padding: 0.75rem;
      }
      .stat .label {
        font-size: 0.75rem;
        color: #475569;
      }
      .stat .value {
        font-size: 1.1rem;
        font-weight: 600;
        color: #0f172a;
      }
      .data-table {
        background: #fff;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0;
        overflow-x: auto;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        padding: 0.6rem;
        border-bottom: 1px solid #e2e8f0;
        text-align: left;
        font-size: 0.85rem;
      }
      th {
        background: #f8fafc;
        font-weight: 600;
      }
      .empty {
        width: 100%;
        padding: 2rem;
        text-align: center;
        color: #64748b;
        font-style: italic;
      }
    `
  ]
})
export class PovStatsComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly povOptions = [
    { key: 'packaging' as PovKey, label: 'Packaging POV' },
    { key: 'fermentation' as PovKey, label: 'Fermentation POV' },
    { key: 'extraction' as PovKey, label: 'Extraction POV' }
  ];

  protected readonly selectedPov = signal<PovKey>('packaging');
  protected readonly filterForm = this.fb.nonNullable.group({
    date: '',
    plant: '',
    product: '',
    campaign: ''
  });

  protected readonly rows = signal<(PackagingResponse | FermentationResponse | ExtractionResponse)[]>([]);
  protected readonly chartState = signal<ChartState>({
    type: 'line',
    data: { labels: [] as string[], datasets: [] },
    options: this.buildLineOptions()
  });

  protected readonly chartTitle = signal('Packaging throughput over time');

  protected readonly chartHasData = computed(() => {
    const labels = this.chartState().data.labels;
    return Array.isArray(labels) && labels.length > 0;
  });

  protected readonly statsSummary = computed<StatsSummary>(() => {
    const pov = this.selectedPov();
    const data = this.rows();

    if (!data.length) {
      return {
        headline: 'No data available',
        metrics: [
          { label: 'Records', value: 0 },
          { label: 'Average', value: 0 }
        ]
      };
    }

    if (pov === 'packaging') {
      let incoming = 0;
      let outgoing = 0;
      data.forEach((item) => {
        const row = item as PackagingResponse;
        incoming += row.incomingAmountKg ?? 0;
        outgoing += row.outgoingAmountKg ?? 0;
      });
      return {
        headline: 'Packaging Summary',
        metrics: [
          { label: 'Total Incoming (kg)', value: incoming },
          { label: 'Total Outgoing (kg)', value: outgoing },
          { label: 'Net Difference (kg)', value: incoming - outgoing }
        ]
      };
    }

    if (pov === 'fermentation') {
      let totalWeight = 0;
      let totalReceived = 0;
      let levelSum = 0;
      let levelCount = 0;

      data.forEach((item) => {
        const row = item as FermentationResponse;
        totalWeight += this.resolveNumber(row.weightLbs, row.weight);
        totalReceived += this.resolveNumber(row.receivedAmountLbs, row.receivedAmount);
        const lvl = this.parseLevelIndicator(row.levelIndicator);
        if (lvl !== null) {
          levelSum += lvl;
          levelCount += 1;
        }
      });

      return {
        headline: 'Fermentation Summary',
        metrics: [
          { label: 'Total Weight (lbs)', value: totalWeight },
          { label: 'Total Received (lbs)', value: totalReceived },
          { label: 'Avg Level Indicator', value: levelCount ? levelSum / levelCount : 0 }
        ]
      };
    }

    let avgConcentration = 0;
    let totalVolume = 0;
    let totalWeight = 0;
    let avgPh = 0;
    let cCount = 0;
    let phCount = 0;

    data.forEach((item) => {
      const row = item as ExtractionResponse;
      if (row.concentration !== undefined && row.concentration !== null) {
        avgConcentration += row.concentration;
        cCount += 1;
      }
      totalVolume += row.volume ?? 0;
      totalWeight += row.weight ?? 0;
      if (row.pH !== undefined && row.pH !== null) {
        avgPh += row.pH;
        phCount += 1;
      }
    });

    return {
      headline: 'Extraction Summary',
      metrics: [
        { label: 'Avg Concentration (g/l)', value: cCount ? avgConcentration / cCount : 0 },
        { label: 'Total Volume (gal)', value: totalVolume },
        { label: 'Total Weight (kg)', value: totalWeight },
        { label: 'Avg pH', value: phCount ? avgPh / phCount : 0 }
      ]
    };
  });

  protected readonly tableColumns = computed(() => {
    switch (this.selectedPov()) {
      case 'packaging':
        return ['Date', 'Plant', 'Product', 'Campaign', 'Package', 'Incoming (kg)', 'Outgoing (kg)'];
      case 'fermentation':
        return ['Date', 'Plant', 'Product', 'Campaign', 'Stage', 'Tank', 'Level Indicator', 'Weight (lbs)', 'Received (lbs)'];
      default:
        return ['Date', 'Plant', 'Product', 'Campaign', 'Stage', 'Tank', 'Concentration (g/l)', 'Volume (gal)', 'Weight (kg)', 'Level Indicator', 'pH'];
    }
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

  protected setPov(pov: PovKey): void {
    if (this.selectedPov() === pov) {
      return;
    }
    this.selectedPov.set(pov);
    this.updateChartTitle();
    this.loadData();
  }

  protected renderCell(row: PackagingResponse | FermentationResponse | ExtractionResponse, column: string): string {
    switch (column) {
      case 'Date':
        return row.date ? new Date(row.date).toISOString().slice(0, 10) : '';
      case 'Plant':
        return (row as any).plant ?? '';
      case 'Product':
        return (row as any).product ?? '';
      case 'Campaign':
        return (row as any).campaign ?? '';
      case 'Package':
        return (row as PackagingResponse).packageType ?? '';
      case 'Incoming (kg)':
        return this.formatNumber((row as PackagingResponse).incomingAmountKg);
      case 'Outgoing (kg)':
        return this.formatNumber((row as PackagingResponse).outgoingAmountKg);
      case 'Stage':
        return (row as any).stage ?? '';
      case 'Tank':
        return (row as any).tank ?? '';
      case 'Level Indicator':
        return (row as any).levelIndicator ?? '';
      case 'Weight (lbs)':
        return this.formatNumber(this.resolveNumber((row as FermentationResponse).weightLbs, (row as FermentationResponse).weight));
      case 'Received (lbs)':
        return this.formatNumber(this.resolveNumber((row as FermentationResponse).receivedAmountLbs, (row as FermentationResponse).receivedAmount));
      case 'Concentration (g/l)':
        return this.formatNumber((row as ExtractionResponse).concentration);
      case 'Volume (gal)':
        return this.formatNumber((row as ExtractionResponse).volume);
      case 'Weight (kg)':
        return this.formatNumber((row as ExtractionResponse).weight);
      case 'pH':
        return this.formatNumber((row as ExtractionResponse).pH);
      default:
        return '';
    }
  }

  private loadData(): void {
    const pov = this.selectedPov();
    const filters = this.buildFilters();

    let request$;
    if (pov === 'packaging') {
      request$ = this.apiService.getFilteredPackaging(filters as PackagingFilters);
    } else if (pov === 'fermentation') {
      request$ = this.apiService.getFermentationData(filters as DataFilters);
    } else {
      request$ = this.apiService.getExtractionData(filters as DataFilters);
    }

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.rows.set(Array.isArray(data) ? data : []);
          this.updateChart();
        },
        error: (err) => {
          console.error('Failed to load POV data', err);
          this.rows.set([]);
          this.chartState.set({
            type: 'line',
            data: { labels: [] as string[], datasets: [] },
            options: this.buildLineOptions()
          });
        }
      });
  }

  private updateChart(): void {
    const pov = this.selectedPov();
    const data = this.rows();

    if (!data.length) {
      this.chartState.set({
        type: 'line',
        data: { labels: [] as string[], datasets: [] },
        options: this.buildLineOptions()
      });
      return;
    }

    if (pov === 'packaging') {
      const aggregated = this.aggregateByDate(data as PackagingResponse[], ['incomingAmountKg', 'outgoingAmountKg']);
      this.chartState.set({
        type: 'line',
        data: {
          labels: aggregated.labels,
          datasets: [
            this.buildLineDataset('Incoming (kg)', aggregated.series.incomingAmountKg, '#22c55e', {
              fill: true,
              backgroundAlpha: 0.2
            }),
            this.buildLineDataset('Outgoing (kg)', aggregated.series.outgoingAmountKg, '#3b82f6', {
              fill: true,
              backgroundAlpha: 0.2
            })
          ]
        },
        options: this.buildLineOptions()
      });
      return;
    }

    if (pov === 'fermentation') {
      const aggregated = this.aggregateByDate(
        data as FermentationResponse[],
        ['weight', 'weightLbs', 'receivedAmount', 'receivedAmountLbs']
      );
      const weightSeries = aggregated.series.weightLbs.length
        ? aggregated.series.weightLbs
        : aggregated.series.weight;
      const receivedSeries = aggregated.series.receivedAmountLbs.length
        ? aggregated.series.receivedAmountLbs
        : aggregated.series.receivedAmount;

      this.chartState.set({
        type: 'line',
        data: {
          labels: aggregated.labels,
          datasets: [
            this.buildLineDataset('Weight (lbs)', weightSeries, '#1d4ed8', { fill: true, backgroundAlpha: 0.2 }),
            this.buildLineDataset('Received (lbs)', receivedSeries, '#f97316', { fill: true, backgroundAlpha: 0.2 })
          ]
        },
        options: this.buildLineOptions()
      });
      return;
    }

    const aggregated = this.aggregateByDate(data as ExtractionResponse[], ['volume', 'weight', 'concentration'], ['concentration']);
    this.chartState.set({
      type: 'line',
      data: {
        labels: aggregated.labels,
        datasets: [
          this.buildLineDataset('Volume (gal)', aggregated.series.volume, '#0ea5e9', { fill: true, backgroundAlpha: 0.2 }),
          this.buildLineDataset('Weight (kg)', aggregated.series.weight, '#22c55e', { fill: true, backgroundAlpha: 0.2 }),
          this.buildLineDataset('Avg Concentration (g/l)', aggregated.series.concentration, '#a855f7', {
            fill: false,
            backgroundAlpha: 0.1,
            dash: true
          })
        ]
      },
      options: this.buildLineOptions()
    });
  }

  private aggregateByDate<T extends { date?: string | Date }>(
    rows: T[],
    fields: string[],
    averageFields: string[] = []
  ) {
    const map = new Map<string, { sums: Record<string, number>; counts: Record<string, number> }>();
    const labels: string[] = [];

    rows.forEach((row) => {
      if (!row.date) {
        return;
      }
      const key = new Date(row.date).toISOString().slice(0, 10);
      if (!map.has(key)) {
        map.set(key, { sums: {}, counts: {} });
        labels.push(key);
      }
      const bucket = map.get(key)!;
      fields.forEach((field) => {
        const value = (row as any)[field];
        if (typeof value === 'number') {
          bucket.sums[field] = (bucket.sums[field] ?? 0) + value;
          bucket.counts[field] = (bucket.counts[field] ?? 0) + 1;
        }
      });
    });

    labels.sort();
    const series: Record<string, number[]> = {};
    fields.forEach((field) => {
      const isAverage = averageFields.includes(field);
      series[field] = labels.map((label) => {
        const bucket = map.get(label);
        if (!bucket) {
          return 0;
        }
        const sum = bucket.sums[field] ?? 0;
        if (isAverage) {
          const count = bucket.counts[field] ?? 0;
          return count ? sum / count : 0;
        }
        return sum;
      });
    });

    return { labels, series };
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

  private updateChartTitle(): void {
    const pov = this.selectedPov();
    const titles: Record<PovKey, string> = {
      packaging: 'Packaging throughput over time',
      fermentation: 'Fermentation production over time',
      extraction: 'Extraction process metrics over time'
    };
    this.chartTitle.set(titles[pov]);
  }

  private resolveNumber(primary?: number | null, fallback?: number | null): number {
    return (primary ?? fallback ?? 0) as number;
  }

  private parseLevelIndicator(value?: string | null): number | null {
    if (!value) {
      return null;
    }
    const numeric = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  }

  private formatNumber(value?: number | null): string {
    if (value === undefined || value === null) {
      return '';
    }
    return Number(value).toFixed(2);
  }

  private buildLineDataset(
    label: string,
    data: number[],
    color: string,
    options: { fill?: boolean; dash?: boolean; backgroundAlpha?: number } = {}
  ) {
    const { fill = false, dash = false, backgroundAlpha = fill ? 0.25 : 0.1 } = options;
    const dataset: ChartConfiguration['data']['datasets'][number] = {
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
