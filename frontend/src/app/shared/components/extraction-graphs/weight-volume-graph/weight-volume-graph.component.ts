import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ExtractionResponse } from '../../../../core/services/api.service';

@Component({
  selector: 'app-extraction-weight-volume-graph',
  standalone: true,
  imports: [NgChartsModule, CommonModule],
  template: `
    <div class="graph-card">
      <h3>Tank Weight vs Volume</h3>
      @if (isLoading) {
        <p>Loading data...</p>
      } @else if (rows && rows.length > 0) {
        <div class="chart-container">
          <canvas
            baseChart
            [data]="chartData"
            [options]="chartOptions"
            chartType="bar">
          </canvas>
        </div>
        @if (selectedRecord; as record) {
          <div class="record-details">
            <div class="details-header">
              <h4>Extraction Record Details</h4>
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
                <span class="label">Plant</span>
                <span class="value plant-badge">{{ record.plant ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Product</span>
                <span class="value">{{ record.product ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Campaign</span>
                <span class="value campaign-badge">{{ record.campaign ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Stage</span>
                <span class="value">{{ record.stage ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Tank</span>
                <span class="value">{{ record.tank ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Weight</span>
                <span class="value weight-value">{{ getWeightKg(record) | number:'1.0-2' }} kg</span>
              </div>
              <div class="detail-item">
                <span class="label">Volume</span>
                <span class="value volume-value">{{ getVolume(record) | number:'1.0-2' }} gal</span>
              </div>
              <div class="detail-item">
                <span class="label">Concentration</span>
                <span class="value concentration-value">{{ getConcentration(record) | number:'1.0-2' }} g/L</span>
              </div>
              <div class="detail-item">
                <span class="label">Level Indicator</span>
                <span class="value">{{ record.levelIndicator ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">pH</span>
                <span class="value">{{ getPh(record) | number:'1.0-2' }}</span>
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
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.25rem;
      padding: 0.25rem;
      line-height: 1;
      transition: color 0.2s ease;
    }

    .close-button:hover {
      color: #f87171;
    }

    .close-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      background: rgba(148, 163, 184, 0.1);
      border-radius: 0.5rem;
      padding: 0.75rem;
    }

    .detail-item .label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #94a3b8;
    }

    .detail-item .value {
      font-size: 0.9rem;
      color: #e2e8f0;
      font-weight: 600;
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

    .concentration-value {
      color: #c084fc !important;
    }

    .volume-value {
      color: #38bdf8 !important;
    }

    .weight-value {
      color: #facc15 !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtractionWeightVolumeGraphComponent implements OnChanges {
  @Input() rows: ExtractionResponse[] | null = null;
  @Input() isLoading = false;

  protected selectedRecord: ExtractionResponse | null = null;
  protected chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  protected chartOptions: ChartOptions<'bar'> = this.createChartOptions();

  ngOnChanges(): void {
    this.updateChartData();
  }

  protected clearSelection(): void {
    this.selectedRecord = null;
  }

  protected getConcentration(record: ExtractionResponse | null | undefined): number {
    return this.resolveNumber(record?.concentration, undefined);
  }

  protected getVolume(record: ExtractionResponse | null | undefined): number {
    return this.resolveNumber(record?.volume, undefined);
  }

  protected getWeightKg(record: ExtractionResponse | null | undefined): number {
    return this.resolveNumber(record?.weight, undefined);
  }

  protected getPh(record: ExtractionResponse | null | undefined): number {
    return this.resolveNumber(record?.pH, undefined);
  }

  protected formatDate(value: string | Date | null | undefined): string {
    if (!value) {
      return 'Unknown';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
  }

  private createChartOptions(): ChartOptions<'bar'> {
    return {
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
              const index = context[0]?.dataIndex ?? 0;
              const record = this.rows?.[index];
              if (!record) {
                return '';
              }
              const date = this.formatDate(record.date ?? null);
              return record.plant ? `${date} - Plant ${record.plant}` : date;
            },
            label: (context) => {
              const value = context.parsed.y ?? 0;
              if (context.datasetIndex === 0) {
                return `Weight: ${value.toFixed(2)} kg`;
              }
              return `Volume: ${value.toFixed(2)} gal`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Amount',
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
        const index = elements[0].index;
        this.selectedRecord = this.rows?.[index] ?? null;
      }
    };
  }

  private updateChartData(): void {
    if (!this.rows?.length) {
      this.chartData = { labels: [], datasets: [] };
      this.selectedRecord = null;
      return;
    }

    const labels = this.rows.map(row => this.formatDate(row.date ?? null));
    const weightData = this.rows.map(row => this.resolveNumber(row.weight, undefined));
    const volumeData = this.rows.map(row => this.resolveNumber(row.volume, undefined));

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Weight (kg)',
          data: weightData,
          backgroundColor: 'rgba(250, 204, 21, 0.5)',
          borderColor: 'rgba(234, 179, 8, 1)',
          borderWidth: 1
        },
        {
          label: 'Volume (gal)',
          data: volumeData,
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        }
      ]
    };

    if (this.selectedRecord) {
      const stillExists = this.rows.some(row => row === this.selectedRecord);
      if (!stillExists) {
        this.selectedRecord = null;
      }
    }
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
}
