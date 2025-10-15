import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartOptions, TooltipItem } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

import { ExtractionResponse } from '../../../../core/services/api.service';

interface PlantVolumeSummary {
  readonly plant: string;
  readonly label: string;
  readonly totalVolume: number;
  readonly totalWeight: number;
  readonly averageVolume: number;
  readonly recordCount: number;
  readonly latestRecord: ExtractionResponse | null;
}

@Component({
  selector: 'app-extraction-plant-volume-graph',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="graph-card">
      <h3>Plant Volume Distribution</h3>
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
              <h4>Plant Volume Details</h4>
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
                <span class="value plant-badge">{{ record.plant }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Total Volume</span>
                <span class="value volume-value">{{ record.totalVolume | number:'1.0-2' }} gal</span>
              </div>
              <div class="detail-item">
                <span class="label">Average Volume</span>
                <span class="value">{{ record.averageVolume | number:'1.0-2' }} gal</span>
              </div>
              <div class="detail-item">
                <span class="label">Total Weight</span>
                <span class="value weight-value">{{ record.totalWeight | number:'1.0-2' }} kg</span>
              </div>
              <div class="detail-item">
                <span class="label">Batch Count</span>
                <span class="value">{{ record.recordCount }}</span>
              </div>
            </div>
            @if (record.latestRecord; as latest) {
              <div class="latest-record">
                <h5>Most Recent Batch</h5>
                <div class="details-grid">
                  <div class="detail-item">
                    <span class="label">Date</span>
                    <span class="value">{{ formatDate(latest.date) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Stage</span>
                    <span class="value">{{ latest.stage ?? 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Tank</span>
                    <span class="value">{{ latest.tank ?? 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Volume</span>
                    <span class="value volume-value">{{ resolveNumber(latest.volume, null) | number:'1.0-2' }} gal</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Weight</span>
                    <span class="value weight-value">{{ resolveNumber(latest.weight, null) | number:'1.0-2' }} kg</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Concentration</span>
                    <span class="value">{{ resolveNumber(latest.concentration, null) | number:'1.0-2' }} g/L</span>
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
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
    }

    .detail-item {
      padding: 0.6rem;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 0.5rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .detail-item .label {
      font-size: 0.75rem;
      color: #94a3b8;
      letter-spacing: 0.02em;
    }

    .detail-item .value {
      font-size: 0.9rem;
      color: #e2e8f0;
      font-weight: 600;
    }

    .plant-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .volume-value {
      color: #38bdf8;
    }

    .weight-value {
      color: #facc15;
    }

    .latest-record {
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 1rem;
    }

    .latest-record h5 {
      margin: 0 0 0.75rem 0;
      color: #cbd5f5;
      font-size: 0.95rem;
      font-weight: 600;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtractionPlantVolumeGraphComponent implements OnChanges {
  @Input() rows: ExtractionResponse[] | null = null;
  @Input() isLoading = false;

  protected selectedRecord: PlantVolumeSummary | null = null;

  protected chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  protected chartOptions: ChartOptions<'bar'> = this.createChartOptions();

  private summaries: PlantVolumeSummary[] = [];

  ngOnChanges(): void {
    this.updateChartData();
  }

  protected clearSelection(): void {
    this.selectedRecord = null;
  }

  protected formatDate(value: string | Date | null | undefined): string {
    if (!value) {
      return 'Unknown';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
  }

  private updateChartData(): void {
    if (!this.rows?.length) {
      this.chartData = { labels: [], datasets: [] };
      this.chartOptions = this.createChartOptions();
      this.summaries = [];
      this.selectedRecord = null;
      return;
    }

    const volumeByPlant = new Map<string, { totalVolume: number; totalWeight: number; rows: ExtractionResponse[] }>();

    this.rows.forEach(row => {
      const plant = (row.plant ?? 'Unknown').trim() || 'Unknown';
      const volume = this.resolveNumber(row.volume, null);
      const weight = this.resolveNumber(row.weight, null);

      const current = volumeByPlant.get(plant);
      if (current) {
        current.totalVolume += volume;
        current.totalWeight += weight;
        current.rows.push(row);
      } else {
        volumeByPlant.set(plant, {
          totalVolume: volume,
          totalWeight: weight,
          rows: [row]
        });
      }
    });

    const summaries = Array.from(volumeByPlant.entries())
      .map<PlantVolumeSummary>(([plant, data]) => {
        const sortedRows = [...data.rows].sort((a, b) => this.getDateValue(b.date) - this.getDateValue(a.date));
        const recordCount = data.rows.length;
        return {
          plant,
          label: `Plant ${plant}`,
          totalVolume: data.totalVolume,
          totalWeight: data.totalWeight,
          averageVolume: recordCount ? data.totalVolume / recordCount : 0,
          recordCount,
          latestRecord: sortedRows[0] ?? null
        };
      })
      .sort((a, b) => b.totalVolume - a.totalVolume);

    this.summaries = summaries;

    this.chartData = {
      labels: summaries.map(item => item.label),
      datasets: [
        {
          label: 'Total Volume (gal)',
          data: summaries.map(item => item.totalVolume),
          backgroundColor: summaries.map((_, index) => {
            const hue = (index * 137.5) % 360;
            return `hsla(${hue}, 70%, 60%, 0.6)`;
          }),
          borderColor: summaries.map((_, index) => {
            const hue = (index * 137.5) % 360;
            return `hsl(${hue}, 70%, 60%)`;
          }),
          borderWidth: 1,
          borderRadius: 4,
          borderSkipped: false
        }
      ]
    };

    this.chartOptions = this.createChartOptions();

    if (this.selectedRecord) {
      const stillExists = this.summaries.find(summary => summary.plant === this.selectedRecord?.plant);
      this.selectedRecord = stillExists ?? null;
    }
  }

  private createChartOptions(): ChartOptions<'bar'> {
    return {
      responsive: true,
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
              const value = context.parsed.y ?? 0;

              if (!summary) {
                return `Total Volume: ${value.toFixed(2)} gal`;
              }

              return [
                `Total Volume: ${value.toFixed(2)} gal`,
                `Average Volume: ${summary.averageVolume.toFixed(2)} gal`,
                `Batches: ${summary.recordCount}`
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
            text: 'Volume (gal)',
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
        const summary = this.summaries[element.index];
        this.selectedRecord = summary ?? null;
      }
    };
  }

  protected resolveNumber(primary: unknown, fallback: unknown): number {
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

  private getDateValue(value: string | Date | null | undefined): number {
    if (!value) {
      return 0;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
}
