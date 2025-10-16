import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, input, effect, inject } from '@angular/core';
import { ChartConfiguration, ChartOptions, TooltipItem } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

import { ExtractionResponse } from '../../../../core/services/api.service';
import { coerceNumber, formatDate } from '../../../utils/data-coercion.util';

interface CampaignPhSummary {
  readonly campaign: string;
  readonly averagePh: number;
  readonly minPh: number;
  readonly maxPh: number;
  readonly recordCount: number;
  readonly latestRecord: ExtractionResponse | null;
}

@Component({
  selector: 'app-extraction-campaign-ph-graph',
  standalone: true,
  imports: [NgChartsModule, CommonModule],
  template: `
    <div class="graph-card">
      <h3>Campaign pH Overview</h3>
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
        @if (selectedSummary; as summary) {
          <div class="record-details">
            <div class="details-header">
              <h4>Campaign pH Details</h4>
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
                <span class="label">Campaign:</span>
                <span class="value campaign-badge">{{ summary.campaign }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Average pH:</span>
                <span class="value ph-value">{{ summary.averagePh | number:'1.0-2' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Min pH:</span>
                <span class="value">{{ summary.minPh | number:'1.0-2' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Max pH:</span>
                <span class="value">{{ summary.maxPh | number:'1.0-2' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Batch Count:</span>
                <span class="value">{{ summary.recordCount }}</span>
              </div>
            </div>
            @if (summary.latestRecord; as latest) {
              <div class="latest-record">
                <h5>Most Recent Batch</h5>
                <div class="details-grid">
                  <div class="detail-item">
                    <span class="label">Date:</span>
                    <span class="value">{{ formatDate(latest.date) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Plant:</span>
                    <span class="value plant-badge">{{ latest.plant ?? 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Stage:</span>
                    <span class="value">{{ latest.stage ?? 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Tank:</span>
                    <span class="value">{{ latest.tank ?? 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">pH:</span>
                    <span class="value ph-value">{{ resolveNumber(latest.pH, null) | number:'1.0-2' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Volume:</span>
                    <span class="value volume-value">{{ resolveNumber(latest.volume, null) | number:'1.0-2' }} gal</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Weight:</span>
                    <span class="value weight-value">{{ resolveNumber(latest.weight, null) | number:'1.0-2' }} kg</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Concentration:</span>
                    <span class="value concentration-value">{{ resolveNumber(latest.concentration, null) | number:'1.0-2' }} g/L</span>
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
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1rem;
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

    .campaign-badge,
    .plant-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem 0.5rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .campaign-badge {
      background: rgba(234, 179, 8, 0.15);
      color: #facc15;
    }

    .plant-badge {
      background: rgba(59, 130, 246, 0.15);
      color: #93c5fd;
    }

    .volume-value {
      color: #34d399 !important;
    }

    .weight-value {
      color: #60a5fa !important;
    }

    .concentration-value {
      color: #c084fc !important;
    }

    .ph-value {
      color: #f97316 !important;
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
export class ExtractionCampaignPhGraphComponent {
  rows = input<ExtractionResponse[] | null>(null);
  isLoading = input<boolean>(false);

  protected selectedSummary: CampaignPhSummary | null = null;
  protected chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  protected chartOptions: ChartOptions<'bar'> = this.createChartOptions();

  private summaries: CampaignPhSummary[] = [];
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    effect(() => {
      // Trigger on rows() or isLoading() changes
      this.rows();
      this.updateChartData();
    });
  }

  protected clearSelection(): void {
    this.selectedSummary = null;
    this.cdr.markForCheck();
  }

  protected formatDate = formatDate;

  private updateChartData(): void {
    const currentRows = this.rows();
    if (!currentRows?.length) {
      this.chartData = { labels: [], datasets: [] };
      this.chartOptions = this.createChartOptions();
      this.summaries = [];
      this.selectedSummary = null;
      this.cdr.markForCheck();
      return;
    }

    const campaignStats = new Map<string, { sumPh: number; count: number; minPh: number; maxPh: number; rows: ExtractionResponse[] }>();

    for (const row of currentRows) {
      if (!row?.campaign) {
        continue;
      }

      const phValue = coerceNumber(row.pH);
      if (phValue === null) {
        continue;
      }

      const key = row.campaign;
      const current = campaignStats.get(key);
      if (current) {
        current.sumPh += phValue;
        current.count += 1;
        current.minPh = Math.min(current.minPh, phValue);
        current.maxPh = Math.max(current.maxPh, phValue);
        current.rows.push(row);
      } else {
        campaignStats.set(key, {
          sumPh: phValue,
          count: 1,
          minPh: phValue,
          maxPh: phValue,
          rows: [row]
        });
      }
    }

    if (!campaignStats.size) {
      this.chartData = { labels: [], datasets: [] };
      this.summaries = [];
      this.selectedSummary = null;
      this.chartOptions = this.createChartOptions();
      this.cdr.markForCheck();
      return;
    }

    const summaries = Array.from(campaignStats.entries())
      .map(([campaign, data]) => {
        const sortedRows = [...data.rows].sort((a, b) => this.getDateValue(b.date) - this.getDateValue(a.date));
        return {
          campaign,
          averagePh: data.sumPh / data.count,
          minPh: data.minPh,
          maxPh: data.maxPh,
          recordCount: data.count,
          latestRecord: sortedRows[0] ?? null
        } satisfies CampaignPhSummary;
      })
      .sort((a, b) => b.averagePh - a.averagePh)
      .slice(0, 10);

    this.summaries = summaries;

    const labels = summaries.map(summary => summary.campaign);
    const averages = summaries.map(summary => summary.averagePh);

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Average pH',
          data: averages,
          backgroundColor: labels.map((_, index) => {
            const hue = (index * 137.5) % 360;
            return `hsla(${hue}, 65%, 60%, 0.6)`;
          }),
          borderColor: labels.map((_, index) => {
            const hue = (index * 137.5) % 360;
            return `hsl(${hue}, 65%, 60%)`;
          }),
          borderWidth: 1
        }
      ]
    };

    this.chartOptions = this.createChartOptions();
    this.syncSelection();
    this.cdr.markForCheck();
  }

  private createChartOptions(): ChartOptions<'bar'> {
    return {
      responsive: true,
      indexAxis: 'y',
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
              const value = context.parsed.x ?? 0;

              if (!summary) {
                return `Average pH: ${value.toFixed(2)}`;
              }

              return [
                `Average pH: ${value.toFixed(2)}`,
                `Min pH: ${summary.minPh.toFixed(2)}`,
                `Max pH: ${summary.maxPh.toFixed(2)}`,
                `Batches: ${summary.recordCount}`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Average pH',
            color: '#e2e8f0'
          },
          ticks: {
            color: '#94a3b8'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        y: {
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
        const index = elements[0].index ?? -1;
        this.selectSummaryByIndex(index);
      }
    };
  }

  private syncSelection(): void {
    if (!this.selectedSummary) {
      return;
    }

    const stillExists = this.summaries.some(summary => summary.campaign === this.selectedSummary?.campaign);
    if (!stillExists) {
      this.selectedSummary = null;
      this.cdr.markForCheck();
    }
  }

  private selectSummaryByIndex(index: number): void {
    if (index < 0 || index >= this.summaries.length) {
      this.selectedSummary = null;
      this.cdr.markForCheck();
      return;
    }

    this.selectedSummary = this.summaries[index] ?? null;
    this.cdr.markForCheck();
  }

  protected resolveNumber(primary: unknown, fallback: unknown): number {
    return coerceNumber(primary) ?? coerceNumber(fallback) ?? 0;
  }

  private getDateValue(value: string | Date | null | undefined): number {
    if (!value) {
      return 0;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }
}
