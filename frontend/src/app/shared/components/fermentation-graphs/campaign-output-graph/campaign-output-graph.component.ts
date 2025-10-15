import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { FermentationResponse } from '../../../../core/services/api.service';

@Component({
  selector: 'app-campaign-output-graph',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="graph-card">
      <h3>Campaign Output</h3>
      @if (isLoading) {
        <p>Loading data...</p>
      } @else if (rows && rows.length > 0) {
        <canvas baseChart
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
export class CampaignOutputGraphComponent implements OnChanges {
  @Input() rows: FermentationResponse[] | null = null;
  @Input() isLoading: boolean = false;

  chartData: ChartConfiguration<'bar'>['data'] = { labels: [], datasets: [] };
  chartOptions: ChartOptions<'bar'> = {
    responsive: true,
    indexAxis: 'y', // This makes it horizontal
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e2e8f0'
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Total Output (lbs)',
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

    // Group by campaign and sum weights
    const campaignMap = new Map<string, { totalWeight: number; totalReceived: number }>();

    this.rows.forEach(row => {
      if (!row.campaign) return;

      const weight = this.resolveNumber(row.weightLbs, row.weight);
      const fallback = (row as { received?: unknown }).received;
      const received = this.resolveNumber(
        row.receivedAmountLbs ?? fallback,
        row.receivedAmount ?? fallback
      );

      const current = campaignMap.get(row.campaign) || { totalWeight: 0, totalReceived: 0 };

      campaignMap.set(row.campaign, {
        totalWeight: current.totalWeight + weight,
        totalReceived: current.totalReceived + received
      });
    });

    // Sort campaigns by total output (weight + received)
    const sortedCampaigns = Array.from(campaignMap.entries())
      .map(([campaign, data]) => ({
        campaign,
        totalOutput: data.totalWeight + data.totalReceived,
        weight: data.totalWeight,
        received: data.totalReceived
      }))
      .sort((a, b) => b.totalOutput - a.totalOutput)
      .slice(0, 10); // Show top 10 campaigns

    const labels = sortedCampaigns.map(c => c.campaign);
    const weights = sortedCampaigns.map(c => c.weight);
    const received = sortedCampaigns.map(c => c.received);

    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Weight Output (lbs)',
          data: weights,
          backgroundColor: 'rgba(139, 92, 246, 0.6)',
          borderColor: 'rgba(139, 92, 246, 1)',
          borderWidth: 1
        },
        {
          label: 'Received Output (lbs)',
          data: received,
          backgroundColor: 'rgba(34, 197, 94, 0.6)',
          borderColor: 'rgba(34, 197, 94, 1)',
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
}
