import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ExtractionResponse } from '../../../../core/services/api.service';

@Component({
  selector: 'app-extraction-plant-volume-graph',
  standalone: true,
  imports: [NgChartsModule, CommonModule],
  template: `
    <div class="graph-card">
      <h3>Plant Volume Distribution</h3>
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
export class ExtractionPlantVolumeGraphComponent implements OnChanges {
  @Input() rows: ExtractionResponse[] | null = null;
  @Input() isLoading = false;

  protected chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  protected chartOptions: ChartOptions<'bar'> = {
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
          label: (context) => {
            const value = context.parsed.y ?? 0;
            return `Total Volume: ${value.toFixed(2)} gal`;
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

    const volumeByPlant = new Map<string, number>();

    this.rows.forEach(row => {
      const plant = row.plant ?? 'Unknown';
      const volume = this.resolveNumber(row.volume, undefined);
      volumeByPlant.set(plant, (volumeByPlant.get(plant) ?? 0) + volume);
    });

    const sorted = Array.from(volumeByPlant.entries())
      .sort((a, b) => b[1] - a[1]);

    const labels = sorted.map(([plant]) => `Plant ${plant}`);
    const volumes = sorted.map(([, value]) => value);

    this.chartData = {
      labels,
      datasets: [{
        label: 'Total Volume (gal)',
        data: volumes,
        backgroundColor: labels.map((_, index) => {
          const hue = (index * 137.5) % 360;
          return `hsla(${hue}, 70%, 60%, 0.6)`;
        }),
        borderColor: labels.map((_, index) => {
          const hue = (index * 137.5) % 360;
          return `hsl(${hue}, 70%, 60%)`;
        }),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false
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
