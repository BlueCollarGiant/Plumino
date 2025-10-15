import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { ChartConfiguration, ChartOptions, TooltipItem } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

import { PackagingResponse } from '../../../../core/services/api.service';

@Component({
  selector: 'app-packaging-carton-flow-graph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="graph-card">
      <h3>Produced vs Shipped Cartons</h3>
      @if (isLoading) {
        <p>Loading data...</p>
      } @else if (rows && rows.length > 0) {
        <div class="chart-container">
          <canvas
            baseChart
            [data]="chartData"
            [options]="chartOptions"
            chartType="bar"
            (chartClick)="onChartClick($event)">
          </canvas>
        </div>
        @if (selectedRecord; as record) {
          <div class="record-details">
            <div class="details-header">
              <h4>Packaging Batch Snapshot</h4>
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
                <span class="label">Date:</span>
                <span class="value">{{ formatDate(record.date) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Plant:</span>
                <span class="value plant-badge">{{ record.plant || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Product:</span>
                <span class="value">{{ record.product || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Campaign:</span>
                <span class="value campaign-badge">{{ record.campaign || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Package Type:</span>
                <span class="value">{{ record.packageType || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Cartons Produced:</span>
                <span class="value produced-value">
                  {{ getIncomingKg(record) | number:'1.0-2' }} kg
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Cartons Shipped:</span>
                <span class="value shipped-value">
                  {{ getOutgoingKg(record) | number:'1.0-2' }} kg
                </span>
              </div>
              <div class="detail-item difference">
                <span class="label">Variance:</span>
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
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .details-header h4 {
      margin: 0;
      color: #e2e8f0;
      font-size: 1rem;
      font-weight: 600;
    }

    .close-button {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 0.5rem;
      padding: 0.375rem 0.5rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #f87171;
      font-size: 0.9rem;
      line-height: 1;
    }

    .close-button:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);
      transform: scale(1.05);
    }

    .close-button:active {
      transform: scale(0.95);
    }

    .close-icon {
      display: inline-block;
      font-weight: 600;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.65rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      gap: 0.75rem;
    }

    .detail-item.difference {
      grid-column: 1 / -1;
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .detail-item.difference .value {
      font-weight: 700;
    }

    .detail-item .label {
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .detail-item .value {
      font-size: 0.85rem;
      color: #e2e8f0;
      font-weight: 600;
      text-align: right;
    }

    .plant-badge,
    .campaign-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
      border-radius: 999px;
      padding: 0.25rem 0.75rem;
      font-weight: 600;
    }

    .campaign-badge {
      background: rgba(234, 179, 8, 0.15);
      color: #fde68a;
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
export class PackagingCartonFlowGraphComponent implements OnChanges {
  @Input() rows: PackagingResponse[] | null = null;
  @Input() isLoading: boolean = false;

  protected chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  protected chartOptions: ChartOptions<'bar'> = {};
  protected selectedRecord: PackagingResponse | null = null;

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(): void {
    this.updateChartData();
  }

  onChartClick(event: unknown): void {
    // handled in chart options
  }

  clearSelection(): void {
    this.selectedRecord = null;
    this.cdr.markForCheck();
  }

  protected getIncomingKg(record: PackagingResponse | null): number {
    if (!record) {
      return 0;
    }
    return this.coerceNumber(record.incomingAmountKg);
  }

  protected getOutgoingKg(record: PackagingResponse | null): number {
    if (!record) {
      return 0;
    }
    return this.coerceNumber(record.outgoingAmountKg);
  }

  protected getVariance(record: PackagingResponse | null): number {
    return this.getIncomingKg(record) - this.getOutgoingKg(record);
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

  private updateChartData(): void {
    if (!this.rows?.length) {
      this.chartData = { labels: [], datasets: [] };
      this.selectedRecord = null;
      this.chartOptions = this.createChartOptions();
      return;
    }

    const labels = this.rows.map(row => this.formatDate(row.date));
    const incoming = this.rows.map(row => this.coerceNumber(row.incomingAmountKg));
    const outgoing = this.rows.map(row => this.coerceNumber(row.outgoingAmountKg));

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Produced (kg)',
          data: incoming,
          backgroundColor: 'rgba(250, 204, 21, 0.5)',
          borderColor: 'rgba(234, 179, 8, 1)',
          borderWidth: 1
        },
        {
          label: 'Shipped (kg)',
          data: outgoing,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
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
          position: 'top',
          labels: {
            color: '#cbd5f5',
            font: {
              family: 'inherit',
              size: 12
            }
          }
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          callbacks: {
            title: (items: TooltipItem<'bar'>[]) => {
              const item = items[0];
              const index = item.dataIndex ?? 0;
              const record = this.rows?.[index];
              if (!record) {
                return this.chartData.labels?.[index]?.toString() ?? '';
              }
              const date = this.formatDate(record.date);
              return record.plant ? `${date} • Plant ${record.plant}` : date;
            },
            label: (item: TooltipItem<'bar'>) => {
              const value = item.parsed.y ?? 0;
              return `${item.dataset.label}: ${value.toFixed(2)} kg`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Carton Weight (kg)',
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
        if (!elements.length || !this.rows?.length) {
          return;
        }
        const index = elements[0].index ?? -1;
        if (index < 0 || index >= this.rows.length) {
          return;
        }
        this.selectedRecord = this.rows[index] ?? null;
        this.cdr.markForCheck();
      }
    };
  }

  private syncSelection(): void {
    if (!this.selectedRecord || !this.rows?.length) {
      return;
    }
    const stillExists = this.rows.includes(this.selectedRecord);
    if (!stillExists) {
      this.selectedRecord = null;
      this.cdr.markForCheck();
    }
  }

  private coerceNumber(value: unknown): number {
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
}
