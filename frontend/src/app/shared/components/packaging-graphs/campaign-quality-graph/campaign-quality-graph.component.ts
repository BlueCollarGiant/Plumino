import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { ChartConfiguration, ChartOptions, TooltipItem } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

import { PackagingResponse } from '../../../../core/services/api.service';

interface CampaignSummary {
  readonly campaign: string;
  readonly label: string;
  readonly totalProduced: number;
  readonly totalShipped: number;
  readonly fulfillmentRate: number;
  readonly variance: number;
  readonly averageShipment: number;
  readonly recordCount: number;
  readonly highlightRecord: PackagingResponse | null;
}

interface SummaryAccumulator {
  totalProduced: number;
  totalShipped: number;
  recordCount: number;
  highlightRecord: PackagingResponse | null;
  highlightMagnitude: number;
}

@Component({
  selector: 'app-packaging-campaign-quality-graph',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="graph-card">
      <h3>Campaign Fulfillment Quality</h3>
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
              <h4>Campaign Summary</h4>
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
                <span class="label">Campaign</span>
                <span class="value campaign-badge">{{ summary.campaign }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Produced</span>
                <span class="value produced-value">{{ summary.totalProduced | number:'1.0-2' }} kg</span>
              </div>
              <div class="detail-item">
                <span class="label">Shipped</span>
                <span class="value shipped-value">{{ summary.totalShipped | number:'1.0-2' }} kg</span>
              </div>
              <div class="detail-item">
                <span class="label">Fulfillment</span>
                <span class="value fulfillment-value">{{ summary.fulfillmentRate | number:'1.0-2' }}%</span>
              </div>
              <div class="detail-item">
                <span class="label">Average Shipment</span>
                <span class="value">{{ summary.averageShipment | number:'1.0-2' }} kg</span>
              </div>
              <div class="detail-item">
                <span class="label">Variance</span>
                <span class="value" [class.positive]="summary.variance >= 0" [class.negative]="summary.variance < 0">
                  {{ summary.variance | number:'1.0-2' }} kg
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Lots Analyzed</span>
                <span class="value">{{ summary.recordCount }}</span>
              </div>
            </div>
            @if (summary.highlightRecord; as record) {
              <div class="highlight-record">
                <h5>Key Batch</h5>
                <div class="details-grid">
                  <div class="detail-item">
                    <span class="label">Date</span>
                    <span class="value">{{ formatDate(record.date) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Plant</span>
                    <span class="value plant-badge">{{ record.plant || 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Product</span>
                    <span class="value">{{ record.product || 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Package Type</span>
                    <span class="value">{{ record.packageType || 'N/A' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Status</span>
                    <span class="value">
                      <span class="status-badge" [class.approved]="getStatus(record) === 'Approved'" [class.pending]="getStatus(record) === 'Pending'">
                        {{ getStatus(record) }}
                      </span>
                    </span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Created By</span>
                    <span class="value">{{ getCreatorName(record) }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="label">Role</span>
                    <span class="value">{{ getCreatorRole(record) }}</span>
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

    .campaign-badge,
    .plant-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      padding: 0.25rem 0.75rem;
      font-weight: 600;
    }

    .campaign-badge {
      background: rgba(234, 179, 8, 0.2);
      color: #fcd34d;
    }

    .plant-badge {
      background: rgba(59, 130, 246, 0.2);
      color: #93c5fd;
    }

    .produced-value {
      color: #fde68a;
      font-weight: 600;
    }

    .shipped-value {
      color: #93c5fd;
      font-weight: 600;
    }

    .fulfillment-value {
      color: #34d399;
      font-weight: 600;
    }

    .detail-item .value.positive {
      color: #4ade80;
    }

    .detail-item .value.negative {
      color: #f87171;
    }

    .highlight-record {
      margin-top: 1.5rem;
    }

    .highlight-record h5 {
      margin: 0 0 0.75rem 0;
      color: #e2e8f0;
      font-size: 0.95rem;
      font-weight: 600;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.3rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .status-badge.approved {
      background: rgba(34, 197, 94, 0.18);
      color: #86efac;
      border: 1px solid rgba(34, 197, 94, 0.35);
    }

    .status-badge.pending {
      background: rgba(245, 158, 11, 0.18);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.35);
    }
  `]
})
export class PackagingCampaignQualityGraphComponent implements OnChanges {
  @Input() rows: PackagingResponse[] | null = null;
  @Input() isLoading: boolean = false;

  protected chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  protected chartOptions: ChartOptions<'bar'> = {};
  protected summaries: CampaignSummary[] = [];
  protected selectedSummary: CampaignSummary | null = null;

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
    const rows = (this.rows ?? []).filter(Boolean);
    if (!rows.length) {
      this.summaries = [];
      this.selectedSummary = null;
      this.chartData = { labels: [], datasets: [] };
      this.chartOptions = this.createChartOptions();
      return;
    }

    const accumulator = new Map<string, SummaryAccumulator>();

    rows.forEach(row => {
      const key = row.campaign?.trim() || 'Unassigned';
      const produced = this.coerceNumber(row.incomingAmountKg);
      const shipped = this.coerceNumber(row.outgoingAmountKg);
      const variance = shipped - produced;

      const entry = accumulator.get(key) ?? {
        totalProduced: 0,
        totalShipped: 0,
        recordCount: 0,
        highlightRecord: null,
        highlightMagnitude: -1
      };

      entry.totalProduced += produced;
      entry.totalShipped += shipped;
      entry.recordCount += 1;

      const magnitude = Math.abs(variance);
      if (!entry.highlightRecord || magnitude >= entry.highlightMagnitude) {
        entry.highlightMagnitude = magnitude;
        entry.highlightRecord = row;
      }

      accumulator.set(key, entry);
    });

    this.summaries = Array.from(accumulator.entries()).map(([campaign, entry]) => {
      const fulfillment = entry.totalProduced > 0
        ? (entry.totalShipped / entry.totalProduced) * 100
        : 0;
      const variance = entry.totalShipped - entry.totalProduced;
      const averageShipment = entry.recordCount > 0
        ? entry.totalShipped / entry.recordCount
        : 0;

      return {
        campaign,
        label: campaign === 'Unassigned' ? 'Unassigned Campaign' : `Campaign ${campaign}`,
        totalProduced: entry.totalProduced,
        totalShipped: entry.totalShipped,
        fulfillmentRate: fulfillment,
        variance,
        averageShipment,
        recordCount: entry.recordCount,
        highlightRecord: entry.highlightRecord
      };
    }).sort((a, b) => b.fulfillmentRate - a.fulfillmentRate);

    this.chartData = {
      labels: this.summaries.map(summary => summary.label),
      datasets: [
        {
          label: 'Fulfillment Rate (%)',
          data: this.summaries.map(summary => summary.fulfillmentRate),
          backgroundColor: this.summaries.map((_, index) => {
            const hue = (index * 141) % 360;
            return `hsla(${hue}, 72%, 60%, 0.55)`;
          }),
          borderColor: this.summaries.map((_, index) => {
            const hue = (index * 141) % 360;
            return `hsl(${hue}, 72%, 60%)`;
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
                return `Fulfillment: ${(context.parsed.y ?? 0).toFixed(2)}%`;
              }
              return [
                `Fulfillment: ${summary.fulfillmentRate.toFixed(2)}%`,
                `Shipped: ${summary.totalShipped.toFixed(2)} kg`,
                `Produced: ${summary.totalProduced.toFixed(2)} kg`,
                `Variance: ${summary.variance.toFixed(2)} kg`
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
            text: 'Fulfillment Rate (%)',
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
    const stillExists = this.summaries.find(summary => summary.campaign === this.selectedSummary?.campaign);
    this.selectedSummary = stillExists ?? null;
    this.cdr.markForCheck();
  }

  protected getStatus(record: PackagingResponse | null): 'Approved' | 'Pending' {
    if (!record || record.status !== 'approved') {
      return 'Pending';
    }
    return 'Approved';
  }

  protected getCreatorName(record: PackagingResponse | null): string {
    if (!record) {
      return 'N/A';
    }
    return record.createdByName ?? record.createdBy ?? 'N/A';
  }

  protected getCreatorRole(record: PackagingResponse | null): string {
    if (!record?.createdByRole) {
      return 'N/A';
    }
    return record.createdByRole.charAt(0).toUpperCase() + record.createdByRole.slice(1);
  }
}
