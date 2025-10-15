import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ExtractionResponse } from '../../../../core/services/api.service';

@Component({
  selector: 'app-extraction-campaign-weight-graph',
  standalone: true,
  imports: [NgChartsModule, CommonModule],
  template: `
    <div class="graph-card">
      <h3>Campaign Output (kg)</h3>
      @if (isLoading) {
        <p>Loading data...</p>
      } @else if (rows && rows.length > 0) {
        <canvas
          baseChart
          [data]="chartData"
          [options]="chartOptions"
          chartType="bar">
        </canvas>
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
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtractionCampaignWeightGraphComponent implements OnChanges {
  @Input() rows: ExtractionResponse[] | null = null;
  @Input() isLoading = false;

  protected chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };

  protected chartOptions: ChartOptions<'bar'> = {
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
          label: (context) => {
            const value = context.parsed.x ?? 0;
            return `Total Weight: ${value.toFixed(2)} kg`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Total Weight (kg)',
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

    const campaignTotals = new Map<string, number>();

    this.rows.forEach(row => {
      if (!row.campaign) {
        return;
      }
      const weight = this.resolveNumber(row.weight, undefined);
      campaignTotals.set(row.campaign, (campaignTotals.get(row.campaign) ?? 0) + weight);
    });

    if (!campaignTotals.size) {
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const sorted = Array.from(campaignTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const labels = sorted.map(([campaign]) => campaign);
    const weights = sorted.map(([, value]) => value);

    this.chartData = {
      labels,
      datasets: [{
        label: 'Total Weight (kg)',
        data: weights,
        backgroundColor: labels.map((_, index) => {
          const hue = (index * 127.5) % 360;
          return `hsla(${hue}, 70%, 60%, 0.6)`;
        }),
        borderColor: labels.map((_, index) => {
          const hue = (index * 127.5) % 360;
          return `hsl(${hue}, 70%, 60%)`;
        }),
        borderWidth: 1
      }]
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
}
