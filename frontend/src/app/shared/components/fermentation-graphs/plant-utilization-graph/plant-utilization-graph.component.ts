import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { FermentationResponse } from '../../../../core/services/api.service';

@Component({
  selector: 'app-plant-utilization-graph',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  template: `
    <div class="graph-card">
      <h3>Plant Activity Overview</h3>
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
export class PlantUtilizationGraphComponent implements OnChanges {
  @Input() rows: FermentationResponse[] | null = null;
  @Input() isLoading: boolean = false;

  chartType = 'bar';
  chartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [{
      label: 'Total Activity (Weight + Received)',
      data: [],
      backgroundColor: 'rgba(75,192,192,0.6)',
      borderColor: 'rgba(75,192,192,1)',
      borderWidth: 1
    }]
  };

  chartOptions: ChartOptions<'bar'> = {
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
          title: (context) => {
            return context[0].label || '';
          },
          label: (context) => {
            const value = context.parsed.y || 0;
            return `Total Activity: ${value.toFixed(2)} lbs`;
          }
        }
      }
    },
    scales: {
      y: {
        title: {
          display: true,
          text: 'lbs processed',
          color: '#e2e8f0'
        },
        beginAtZero: true,
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
      this.chartData = {
        labels: [],
        datasets: [{
          label: 'Total Activity (Weight + Received)',
          data: [],
          backgroundColor: 'rgba(75,192,192,0.6)',
          borderColor: 'rgba(75,192,192,1)',
          borderWidth: 1
        }]
      };
      return;
    }

    // Group rows by Plant number and sum total weight and received
    const activity = Object.values(
      this.rows.reduce((acc: any, r) => {
        const plant = r.plant ?? 'Unknown';
        if (!acc[plant]) acc[plant] = { plant, total: 0 };

        // Use weightLbs if available, otherwise weight, default to 0
        const weight = r.weightLbs || r.weight || 0;
        // Use receivedAmountLbs if available, otherwise receivedAmount, default to 0
        const received = r.receivedAmountLbs || r.receivedAmount || 0;

        acc[plant].total += weight + received;
        return acc;
      }, {})
    );

    // Sort by plant number ascending
    activity.sort((a: any, b: any) => {
      if (a.plant === 'Unknown') return 1;
      if (b.plant === 'Unknown') return -1;
      return parseInt(a.plant) - parseInt(b.plant);
    });

    this.chartData = {
      labels: activity.map((a: any) => 'Plant ' + a.plant),
      datasets: [{
        label: 'Total Activity (Weight + Received)',
        data: activity.map((a: any) => a.total),
        backgroundColor: activity.map((_, index) => {
          const hue = (index * 137.5) % 360; // Golden angle for better color distribution
          return `hsla(${hue}, 70%, 60%, 0.6)`;
        }),
        borderColor: activity.map((_, index) => {
          const hue = (index * 137.5) % 360;
          return `hsla(${hue}, 70%, 60%, 1)`;
        }),
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false,
      }]
    };
  }
}
