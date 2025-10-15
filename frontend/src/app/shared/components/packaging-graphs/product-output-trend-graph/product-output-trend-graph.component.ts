import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { ChartConfiguration, ChartOptions, TooltipItem } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

import { PackagingResponse } from '../../../../core/services/api.service';

@Component({
  selector: 'app-packaging-product-output-trend-graph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="graph-card">
      <h3>Product Output Trend</h3>
      @if (isLoading) {
        <p>Loading data...</p>
      } @else if (chartData.datasets.length > 0) {
        <div class="chart-container">
          <canvas
            baseChart
            [data]="chartData"
            [options]="chartOptions"
            chartType="line"
            (chartClick)="onChartClick($event)">
          </canvas>
        </div>
        @if (selectedRecord; as record) {
          <div class="record-details">
            <div class="details-header">
              <h4>Trend Point Details</h4>
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
                <span class="label">Date</span>
                <span class="value">{{ formatDate(record.date) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Product</span>
                <span class="value product-badge">{{ record.product || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Plant</span>
                <span class="value plant-badge">{{ record.plant || 'N/A' }}</span>
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
              <div class="detail-item difference">
                <span class="label">Variance</span>
                <span class="value" [class.positive]="getVariance(record) >= 0" [class.negative]="getVariance(record) < 0">
                  {{ getVariance(record) | number:'1.0-2' }} kg
                </span>
              </div>
            </div>
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
      line-height: 1;
      padding: 0.25rem;
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

    .product-badge,
    .plant-badge,
    .campaign-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 0.25rem 0.75rem;
      font-weight: 600;
    }

    .product-badge {
      background: rgba(125, 211, 252, 0.18);
      color: #38bdf8;
    }

    .plant-badge {
      background: rgba(96, 165, 250, 0.18);
      color: #60a5fa;
    }

    .campaign-badge {
      background: rgba(250, 204, 21, 0.18);
      color: #facc15;
    }

    .produced-value {
      color: #fde68a;
      font-weight: 600;
    }

    .shipped-value {
      color: #93c5fd;
      font-weight: 600;
    }

    .difference .value.positive {
      color: #4ade80;
    }

    .difference .value.negative {
      color: #f87171;
    }
  `]
})
export class PackagingProductOutputTrendGraphComponent implements OnChanges {
  @Input() rows: PackagingResponse[] | null = null;
  @Input() isLoading: boolean = false;

  protected chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  protected chartOptions: ChartOptions<'line'> = {};
  protected datasetRecordMatrix: (PackagingResponse | null)[][] = [];
  protected selectedRecord: PackagingResponse | null = null;

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(): void {
    this.buildDatasets();
  }

  onChartClick(event: unknown): void {
    // handled in chart options
  }

  clearSelection(): void {
    this.selectedRecord = null;
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

  protected getVariance(record: PackagingResponse | null): number {
    if (!record) {
      return 0;
    }
    return this.coerceNumber(record.incomingAmountKg) - this.coerceNumber(record.outgoingAmountKg);
  }

  private buildDatasets(): void {
    const rows = (this.rows ?? []).filter(Boolean);
    if (!rows.length) {
      this.chartData = { labels: [], datasets: [] };
      this.datasetRecordMatrix = [];
      this.selectedRecord = null;
      this.chartOptions = this.createChartOptions();
      return;
    }

    const sortedRows = [...rows].sort((a, b) => this.getTimestamp(a.date) - this.getTimestamp(b.date));

    const labelList: string[] = [];
    const labelIndex = new Map<string, number>();

    sortedRows.forEach(row => {
      const label = this.formatDate(row.date);
      if (!labelIndex.has(label)) {
        labelIndex.set(label, labelList.length);
        labelList.push(label);
      }
    });

    const productKeys = Array.from(
      new Set(sortedRows.map(row => row.product?.trim() || 'Unassigned'))
    ).sort((a, b) => a.localeCompare(b));

    const datasets: ChartConfiguration<'line'>['data']['datasets'] = [];
    const recordMatrix: (PackagingResponse | null)[][] = [];

    productKeys.forEach((productKey, index) => {
      const data = new Array<number | null>(labelList.length).fill(null);
      const matrixRow: (PackagingResponse | null)[] = new Array(labelList.length).fill(null);

      sortedRows
        .filter(row => (row.product?.trim() || 'Unassigned') === productKey)
        .forEach(row => {
          const label = this.formatDate(row.date);
          const position = labelIndex.get(label);
          if (position === undefined) {
            return;
          }
          data[position] = this.coerceNumber(row.outgoingAmountKg);
          matrixRow[position] = row;
        });

      const colors = this.getColorFromIndex(index);
      datasets.push({
        label: productKey === 'Unassigned' ? 'Unassigned Product' : productKey,
        data,
        borderColor: colors.border,
        backgroundColor: colors.fill,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: colors.point,
        pointBorderColor: '#0f172a',
        tension: 0.35,
        spanGaps: false
      });

      recordMatrix.push(matrixRow);
    });

    this.chartData = {
      labels: labelList,
      datasets
    };
    this.datasetRecordMatrix = recordMatrix;
    this.chartOptions = this.createChartOptions();
    this.syncSelection();
  }

  private createChartOptions(): ChartOptions<'line'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Shipped Output (kg)',
            color: '#e2e8f0'
          },
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      },
      plugins: {
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          callbacks: {
            title: (items: TooltipItem<'line'>[]) => {
              const item = items[0];
              const record = this.datasetRecordMatrix[item.datasetIndex ?? 0]?.[item.dataIndex ?? 0] ?? null;
              if (!record) {
                return item.label ?? '';
              }
              const date = this.formatDate(record.date);
              return record.product ? `${date} • ${record.product}` : date;
            },
            label: (item: TooltipItem<'line'>) => {
              const record = this.datasetRecordMatrix[item.datasetIndex ?? 0]?.[item.dataIndex ?? 0] ?? null;
              if (!record) {
                return `Shipped: ${(item.parsed.y ?? 0).toFixed(2)} kg`;
              }
              const shipped = this.coerceNumber(record.outgoingAmountKg).toFixed(2);
              const produced = this.coerceNumber(record.incomingAmountKg).toFixed(2);
              const variance = (this.coerceNumber(record.outgoingAmountKg) - this.coerceNumber(record.incomingAmountKg)).toFixed(2);
              return [
                `Shipped: ${shipped} kg`,
                `Produced: ${produced} kg`,
                `Variance: ${variance} kg`
              ];
            }
          }
        },
        legend: {
          position: 'bottom',
          labels: {
            color: '#cbd5f5',
            usePointStyle: true
          }
        }
      },
      onClick: (_event, elements) => {
        if (!elements.length) {
          return;
        }
        const element = elements[0];
        const datasetIndex = element.datasetIndex ?? -1;
        const dataIndex = element.index ?? -1;
        const record = this.datasetRecordMatrix[datasetIndex]?.[dataIndex] ?? null;
        this.selectedRecord = record;
        this.cdr.markForCheck();
      }
    };
  }

  private syncSelection(): void {
    if (!this.selectedRecord) {
      return;
    }
    const stillExists = this.datasetRecordMatrix.some(dataset =>
      dataset.some(record => record === this.selectedRecord)
    );
    if (!stillExists) {
      this.selectedRecord = null;
      this.cdr.markForCheck();
    }
  }

  private getColorFromIndex(index: number): { border: string; fill: string; point: string } {
    const hue = (index * 97) % 360;
    return {
      border: `hsl(${hue}, 78%, 60%)`,
      fill: `hsla(${hue}, 78%, 60%, 0.25)`,
      point: `hsl(${hue}, 78%, 75%)`
    };
  }

  private getTimestamp(value: string | Date | null | undefined): number {
    if (!value) {
      return 0;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
}
