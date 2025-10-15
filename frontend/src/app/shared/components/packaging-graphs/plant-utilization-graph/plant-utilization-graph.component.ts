import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { ChartConfiguration, ChartOptions, TooltipItem } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

import { PackagingResponse } from '../../../../core/services/api.service';

interface PlantUtilizationSummary {
  readonly plant: string;
  readonly label: string;
  readonly totalProduced: number;
  readonly totalShipped: number;
  readonly utilizationRate: number;
  readonly shippedPerBatch: number;
  readonly batchCount: number;
  readonly latestRecord: PackagingResponse | null;
}

interface SummaryAccumulator {
  totalProduced: number;
  totalShipped: number;
  batchCount: number;
  latestRecord: PackagingResponse | null;
  latestTimestamp: number;
}

@Component({
  selector: 'app-packaging-plant-utilization-graph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="graph-card">
      <h3>Packaging Line Utilization</h3>
      @if (isLoading) {
        <p>Loading data...</p>
      } @else if (summaries.length > 0) {
        <div class="chart-container">
          <canvas
            baseChart
            [data]="chartData"
            [options]="chartOptions"
            chartType="bar"
            (chartClick)="onChartClick($event)">
          </canvas>
        </div>
        @if (selectedSummary; as summary) {
          <div class="record-details">
            <div class="details-header">
              <h4>Plant Utilization Details</h4>
              <button
                type="button"
                class="close-button"
                (click)="clearSelection()"
                title="Close details">
                <span class="close-icon">&times;</span>
              </button>
            </div>
            <div class="details-grid">
              <div class="detail-item">
                <span class="label">Plant</span>
                <span class="value plant-badge">{{ summary.plant }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Total Produced</span>
                <span class="value produced-value">
                  {{ summary.totalProduced | number:'1.0-2' }} kg
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Total Shipped</span>
                <span class="value shipped-value">
                  {{ summary.totalShipped | number:'1.0-2' }} kg
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Utilization</span>
                <span class="value utilization-value">
                  {{ summary.utilizationRate | number:'1.0-2' }}%
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Average Shipment</span>
                <span class="value">
                  {{ summary.shippedPerBatch | number:'1.0-2' }} kg per batch
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Batch Count</span>
                <span class="value">
                  {{ summary.batchCount }}
                </span>
              </div>
            </div>
            @if (summary.latestRecord; as record) {
              <div class="latest-record">
                <h5>Most Recent Batch</h5>
                <div class="details-grid">
                  <div class="detail-item">
                    <span class="label">Date</span>
                    <span class="value">{{ formatDate(record.date) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Product</span>
                    <span class="value">{{ record.product || 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Campaign</span>
                    <span class="value campaign-badge">{{ record.campaign || 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Package Type</span>
                    <span class="value">{{ record.packageType || 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Produced</span>
                    <span class="value produced-value">
                      {{ coerceNumber(record.incomingAmountKg) | number:'1.0-2' }} kg
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Shipped</span>
                    <span class="value shipped-value">
                      {{ coerceNumber(record.outgoingAmountKg) | number:'1.0-2' }} kg
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>
        }
      } @else {
        <p>No data available</p>
      }
    </div>
  `,
  styles: [`
    .graph-card {
      display: flex;
      flex-direction: column;
      min-height: 400px;
      overflow: visible;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      backdrop-filter: blur(10px);
    }

    .graph-card h3 {
      margin: 0 0 1rem 0;
      color: #e2e8f0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .graph-card p {
      color: #94a3b8;
      margin: 0;
      font-size: 0.9rem;
    }

    .chart-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
    }

    .chart-container canvas {
      width: 100% !important;
      height: 100% !important;
    }

    .record-details {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.75rem;
      padding: 1rem;
      margin-top: 1rem;
    }

    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .details-header h4 {
      margin: 0;
      color: #e2e8f0;
      font-size: 1rem;
      font-weight: 600;
    }

    .close-button {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0.25rem;
      line-height: 1;
    }

    .close-button:hover {
      color: #f1f5f9;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.75rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 0.5rem;
      padding: 0.75rem;
    }

    .label {
      font-size: 0.8rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .value {
      font-size: 0.95rem;
      color: #e2e8f0;
    }

    .plant-badge,
    .campaign-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 0.25rem 0.75rem;
      font-weight: 600;
    }

    .plant-badge {
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }

    .campaign-badge {
      background: rgba(34, 197, 94, 0.2);
      color: #bbf7d0;
    }

    .produced-value {
      color: #fde68a;
      font-weight: 600;
    }

    .shipped-value {
      color: #93c5fd;
      font-weight: 600;
    }

    .utilization-value {
      color: #34d399;
      font-weight: 600;
    }

    .latest-record {
      margin-top: 1.5rem;
    }

    .latest-record h5 {
      margin: 0 0 0.75rem 0;
      color: #e2e8f0;
      font-size: 0.95rem;
      font-weight: 600;
    }
  `]
})
export class PackagingPlantUtilizationGraphComponent implements OnChanges {
  @Input() rows: PackagingResponse[] | null = null;
  @Input() isLoading: boolean = false;

  protected chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  protected chartOptions: ChartOptions<'bar'> = {};
  protected summaries: PlantUtilizationSummary[] = [];
  protected selectedSummary: PlantUtilizationSummary | null = null;

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(): void {
    this.buildSummaries();
  }

  onChartClick(event: unknown): void {
    // handled in chart options
  }

  clearSelection(): void {
    this.selectedSummary = null;
    this.cdr.markForCheck();
  }

  protected formatDate(value: string | Date | null | undefined): string {
    if (!value) {
      return 'N/A';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  }

  protected coerceNumber(value: unknown): number {
    if (value === undefined || value === null) {
      return 0;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === 'string') {
      const normalized = value.replace(/[^0-9.-]/g, '');
      if (!normalized) {
        return 0;
      }
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private buildSummaries(): void {
    const rows = this.rows ?? [];
    if (!rows.length) {
      this.summaries = [];
      this.selectedSummary = null;
      this.chartData = { labels: [], datasets: [] };
      this.chartOptions = this.createChartOptions();
      return;
    }

    const accumulator = new Map<string, SummaryAccumulator>();

    for (const row of rows) {
      const plant = row.plant?.trim() || 'Unassigned';
      const produced = this.coerceNumber(row.incomingAmountKg);
      const shipped = this.coerceNumber(row.outgoingAmountKg);

      if (!accumulator.has(plant)) {
        accumulator.set(plant, {
          totalProduced: 0,
          totalShipped: 0,
          batchCount: 0,
          latestRecord: null,
          latestTimestamp: -Infinity
        });
      }

      const entry = accumulator.get(plant)!;
      entry.totalProduced += produced;
      entry.totalShipped += shipped;
      entry.batchCount += 1;

      const timestamp = this.getTimestamp(row.date);
      if (timestamp >= entry.latestTimestamp) {
        entry.latestTimestamp = timestamp;
        entry.latestRecord = row;
      }
    }

    this.summaries = Array.from(accumulator.entries()).map(([plant, entry]) => {
      const utilization = entry.totalProduced > 0
        ? (entry.totalShipped / entry.totalProduced) * 100
        : 0;
      const shippedPerBatch = entry.batchCount > 0
        ? entry.totalShipped / entry.batchCount
        : 0;

      return {
        plant,
        label: plant === 'Unassigned' ? 'Unassigned Plant' : `Plant ${plant}`,
        totalProduced: entry.totalProduced,
        totalShipped: entry.totalShipped,
        utilizationRate: utilization,
        shippedPerBatch,
        batchCount: entry.batchCount,
        latestRecord: entry.latestRecord
      };
    }).sort((a, b) => b.utilizationRate - a.utilizationRate);

    this.chartData = {
      labels: this.summaries.map((summary) => summary.label),
      datasets: [
        {
          label: 'Utilization (%)',
          data: this.summaries.map((summary) => summary.utilizationRate),
          backgroundColor: this.summaries.map((_, index) => {
            const hue = (index * 127.5) % 360;
            return `hsla(${hue}, 70%, 60%, 0.6)`;
          }),
          borderColor: this.summaries.map((_, index) => {
            const hue = (index * 127.5) % 360;
            return `hsl(${hue}, 70%, 60%)`;
          }),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    };

    this.chartOptions = this.createChartOptions();
    this.syncSelection();
  }

  private createChartOptions(): ChartOptions<'bar'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          callbacks: {
            label: (context: TooltipItem<'bar'>) => {
              const index = context.dataIndex ?? 0;
              const summary = this.summaries[index];
              if (!summary) {
                return `Utilization: ${(context.parsed.y ?? 0).toFixed(2)}%`;
              }
              const utilization = summary.utilizationRate.toFixed(2);
              const produced = summary.totalProduced.toFixed(2);
              const shipped = summary.totalShipped.toFixed(2);
              return [
                `Utilization: ${utilization}%`,
                `Produced: ${produced} kg`,
                `Shipped: ${shipped} kg`,
                `Batches: ${summary.batchCount}`
              ];
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: 120,
          title: {
            display: true,
            text: 'Utilization (%)',
            color: '#e2e8f0'
          },
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      onClick: (_event, elements) => {
        if (!elements.length) {
          return;
        }
        const element = elements[0];
        const summary = this.summaries[element.index ?? -1] ?? null;
        this.selectedSummary = summary;
        this.cdr.markForCheck();
      }
    };
  }

  private syncSelection(): void {
    if (!this.selectedSummary) {
      return;
    }
    const stillExists = this.summaries.find((summary) => summary.plant === this.selectedSummary?.plant);
    this.selectedSummary = stillExists ?? null;
    this.cdr.markForCheck();
  }

  private getTimestamp(value: string | Date | null | undefined): number {
    if (!value) {
      return 0;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
}
