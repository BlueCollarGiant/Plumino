import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, input, effect, inject } from '@angular/core';
import { ChartConfiguration, ChartOptions, TooltipItem } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

import { ExtractionResponse } from '../../../../core/services/api.service';
import { coerceNumber, formatDate } from '../../../utils/data-coercion.util';

@Component({
  selector: 'app-extraction-weight-volume-graph',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="graph-card">
      <h3>Tank Weight vs Volume</h3>
      @if (isLoading()) {
        <p>Loading data...</p>
      } @else if (rows() && rows()!.length > 0) {
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
                <span class="label">Date:</span>
                <span class="value">{{ formatDate(record.date) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Plant:</span>
                <span class="value plant-badge">{{ record.plant ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Product:</span>
                <span class="value">{{ record.product ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Campaign:</span>
                <span class="value campaign-badge">{{ record.campaign ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Stage:</span>
                <span class="value">{{ record.stage ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Tank:</span>
                <span class="value">{{ record.tank ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Weight:</span>
                <span class="value weight-value">{{ getWeightKg(record) | number:'1.0-2' }} kg</span>
              </div>
              <div class="detail-item">
                <span class="label">Volume:</span>
                <span class="value volume-value">{{ getVolume(record) | number:'1.0-2' }} gal</span>
              </div>
              <div class="detail-item">
                <span class="label">Concentration:</span>
                <span class="value concentration-value">{{ getConcentration(record) | number:'1.0-2' }} g/L</span>
              </div>
              <div class="detail-item">
                <span class="label">Level:</span>
                <span class="value">{{ record.levelIndicator ?? 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">pH:</span>
                <span class="value ph-value">{{ getPh(record) | number:'1.0-2' }}</span>
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
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .detail-item {
      padding: 0.6rem 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
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
    }

    .plant-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .campaign-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      background: rgba(234, 179, 8, 0.15);
      color: #facc15;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .concentration-value {
      color: #c084fc !important;
    }

    .volume-value {
      color: #34d399 !important;
    }

    .weight-value {
      color: #60a5fa !important;
    }

    .ph-value {
      color: #f97316 !important;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtractionWeightVolumeGraphComponent {
  rows = input<ExtractionResponse[] | null>(null);
  isLoading = input<boolean>(false);

  protected selectedRecord: ExtractionResponse | null = null;

  protected chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  protected chartOptions: ChartOptions<'bar'> = this.createChartOptions();

  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      this.rows();
      this.updateChartData();
    });
  }

  protected clearSelection(): void {
    this.selectedRecord = null;
    this.cdr.markForCheck();
  }

  protected getConcentration(record: ExtractionResponse | null | undefined): number {
    return this.resolveNumber(record?.concentration, null);
  }

  protected getVolume(record: ExtractionResponse | null | undefined): number {
    return this.resolveNumber(record?.volume, null);
  }

  protected getWeightKg(record: ExtractionResponse | null | undefined): number {
    return this.resolveNumber(record?.weight, null);
  }

  protected getPh(record: ExtractionResponse | null | undefined): number {
    return this.resolveNumber(record?.pH, null);
  }

  protected formatDate = formatDate;

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
            title: (context: TooltipItem<'bar'>[]) => {
              const index = context[0]?.dataIndex ?? 0;
              const record = this.rows()?.[index];
              if (!record) {
                return '';
              }
              const date = this.formatDate(record.date ?? null);
              return record.plant ? `${date} - Plant ${record.plant}` : date;
            },
            label: (context: TooltipItem<'bar'>) => {
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
        this.selectRecordByIndex(index);
      }
    };
  }

  private updateChartData(): void {
    const currentRows = this.rows();
    if (!currentRows?.length) {
      this.chartData = { labels: [], datasets: [] };
      this.selectedRecord = null;
      return;
    }

    const labels = currentRows.map(row => this.formatDate(row.date ?? null));
    const weightData = currentRows.map(row => this.resolveNumber(row.weight, null));
    const volumeData = currentRows.map(row => this.resolveNumber(row.volume, null));

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
      const stillExists = currentRows.some(row => row === this.selectedRecord);
      if (!stillExists) {
        this.selectedRecord = null;
        this.cdr.markForCheck();
      }
    }
  }

  protected resolveNumber(primary: unknown, fallback: unknown): number {
    return coerceNumber(primary) ?? coerceNumber(fallback) ?? 0;
  }

  private selectRecordByIndex(index: number): void {
    const currentRows = this.rows();
    if (!currentRows?.length || index < 0 || index >= currentRows.length) {
      this.selectedRecord = null;
      this.cdr.markForCheck();
      return;
    }
    this.selectedRecord = currentRows[index] ?? null;
    this.cdr.markForCheck();
  }
}
