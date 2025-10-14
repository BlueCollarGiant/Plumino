import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { FermentationResponse } from '../../../core/services/api.service';

@Component({
  selector: 'app-input-output-graph',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="graph-card">
      <h3>Input/Output Analysis</h3>
      @if (isLoading) {
        <p>Loading data...</p>
      } @else if (rows && rows.length > 0) {
        <div class="chart-container">
          <canvas baseChart
            [data]="chartData"
            [options]="chartOptions"
            chartType="bar"
            (chartClick)="onChartClick($event)"
            (chartHover)="onChartHover($event)">
          </canvas>
        </div>
        @if (selectedRecord) {
          <div class="record-details">
            <div class="details-header">
              <h4>📊 Record Details</h4>
              <button type="button" class="close-button" (click)="clearSelection()" title="Close details">
                <span class="close-icon">✕</span>
              </button>
            </div>
            <div class="details-grid">
              <div class="detail-item">
                <span class="label">Date:</span>
                <span class="value">{{ selectedRecord.date | date:'MMM dd, yyyy' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Plant:</span>
                <span class="value plant-badge">{{ selectedRecord.plant }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Product:</span>
                <span class="value">{{ selectedRecord.product }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Campaign:</span>
                <span class="value campaign-badge">{{ selectedRecord.campaign }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Stage:</span>
                <span class="value">{{ selectedRecord.stage }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Tank:</span>
                <span class="value">{{ selectedRecord.tank }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Weight:</span>
                <span class="value weight-value">{{ getWeight(selectedRecord) | number:'1.0-2' }} lbs</span>
              </div>
              <div class="detail-item">
                <span class="label">Received:</span>
                <span class="value received-value">{{ getReceived(selectedRecord) | number:'1.0-2' }} lbs</span>
              </div>
              <div class="detail-item">
                <span class="label">Level:</span>
                <span class="value">{{ selectedRecord.levelIndicator }}</span>
              </div>
              <div class="detail-item difference">
                <span class="label">Difference:</span>
                <span class="value" [class.positive]="getDifference(selectedRecord) > 0"
                      [class.negative]="getDifference(selectedRecord) < 0">
                  {{ getDifference(selectedRecord) | number:'1.0-2' }} lbs
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
      margin-bottom: 1.5rem;
    }

    .record-details {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 0.75rem;
      padding: 1rem;
      margin-top: 1rem;
    }

    .record-details h4 {
      margin: 0 0 1rem 0;
      color: #e2e8f0;
      font-size: 1rem;
      font-weight: 600;
    }

    .details-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .details-header h4 {
      margin: 0;
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
      color: #f87171;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1;
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
      padding: 0.5rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .detail-item.difference {
      grid-column: 1 / -1;
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .detail-item .label {
      font-size: 0.8rem;
      color: #94a3b8;
      font-weight: 500;
    }

    .detail-item .value {
      font-size: 0.85rem;
      color: #e2e8f0;
      font-weight: 600;
      text-align: right;
    }

    .plant-badge {
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.75rem !important;
    }

    .campaign-badge {
      background: rgba(34, 197, 94, 0.2);
      color: #86efac;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.75rem !important;
    }

    .weight-value {
      color: #60a5fa !important;
    }

    .received-value {
      color: #34d399 !important;
    }

    .positive {
      color: #22c55e !important;
    }

    .negative {
      color: #ef4444 !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputOutputGraphComponent implements OnChanges {
  @Input() rows: FermentationResponse[] | null = null;
  @Input() isLoading: boolean = false;

  selectedRecord: FermentationResponse | null = null;
  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e2e8f0'
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
          title: (context) => {
            const index = context[0].dataIndex;
            const record = this.rows?.[index];
            return record ? `${new Date(record.date!).toLocaleDateString()} - ${record.plant}` : '';
          },
          label: (context) => {
            const index = context.dataIndex;
            const record = this.rows?.[index];
            if (!record) return '';

            const weight = this.getWeight(record);
            const received = this.getReceived(record);
            const diff = weight - received;
            const value = context.parsed.y || 0;

            return [
              `${context.dataset.label}: ${value.toFixed(2)} lbs`,
              `Campaign: ${record.campaign}`,
              `Product: ${record.product}`,
              `Tank: ${record.tank}`,
              `Difference: ${diff.toFixed(2)} lbs`
            ];
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'lbs',
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
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        this.selectedRecord = this.rows?.[index] || null;
      }
    }
  };

  ngOnChanges(): void {
    this.updateChartData();
  }

  private updateChartData(): void {
    if (!this.rows?.length) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const labels = this.rows.map(r => r.date ? new Date(r.date).toLocaleDateString() : 'Unknown');
    const weights = this.rows.map(r => this.resolveNumber(r.weightLbs, r.weight));
    const received = this.rows.map(r => {
      const fallback = (r as { received?: unknown }).received;
      return this.resolveNumber(
        r.receivedAmountLbs ?? fallback,
        r.receivedAmount ?? fallback
      );
    });

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Weight (lbs)',
          data: weights,
          backgroundColor: 'rgba(54,162,235,0.5)',
          borderColor: 'rgba(54,162,235,1)',
          borderWidth: 1
        },
        {
          label: 'Received (lbs)',
          data: received,
          backgroundColor: 'rgba(75,192,192,0.5)',
          borderColor: 'rgba(75,192,192,1)',
          borderWidth: 1
        }
      ]
    };
  }

  private resolveNumber(primary: unknown, fallback: unknown): number {
    return this.coerceNumber(primary) ?? this.coerceNumber(fallback) ?? 0;
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
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  // Chart interaction methods
  onChartClick(event: any): void {
    // Chart click is now handled in chartOptions.onClick
  }

  onChartHover(event: any): void {
    // Chart hover interactions can be handled here if needed
  }

  // Helper methods for template
  getWeight(record: FermentationResponse): number {
    return this.resolveNumber(record.weightLbs, record.weight);
  }

  getReceived(record: FermentationResponse): number {
    const fallback = (record as { received?: unknown }).received;
    return this.resolveNumber(
      record.receivedAmountLbs ?? fallback,
      record.receivedAmount ?? fallback
    );
  }

  getDifference(record: FermentationResponse): number {
    return this.getWeight(record) - this.getReceived(record);
  }

  clearSelection(): void {
    this.selectedRecord = null;
  }
}
