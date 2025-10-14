import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ChartDataset, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';

export interface FermentationChartSeries {
  readonly name: string;
  readonly data: ReadonlyArray<{ readonly x: string | Date; readonly y: number }>;
}

@Component({
  selector: 'app-fermentation-yield-graph',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './fermentation-yield-graph.component.html',
  styleUrl: './fermentation-yield-graph.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FermentationYieldGraphComponent {
  private _chartData: readonly FermentationChartSeries[] | null = null;

  readonly lineChartData: ChartDataset<'line'>[] = [];
  readonly lineChartLabels: string[] = [];
  readonly lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' }
    },
    scales: {
      x: { title: { display: true, text: 'Date' } },
      y: { title: { display: true, text: 'Yield %' }, min: 0, max: 120 }
    }
  };

  private readonly colorPalette = [
    '#1d4ed8',
    '#16a34a',
    '#f97316',
    '#9333ea',
    '#0ea5e9',
    '#dc2626',
    '#0d9488',
    '#f59e0b'
  ];

  @Input()
  get chartData(): readonly FermentationChartSeries[] | null {
    return this._chartData;
  }
  set chartData(value: readonly FermentationChartSeries[] | null | undefined) {
    this._chartData = Array.isArray(value) && value.length ? value : null;
    this.rebuildChartState();
  }

  @Input() isLoading = false;

  private rebuildChartState(): void {
    const seriesList = this._chartData;

    if (!seriesList) {
      this.lineChartLabels.length = 0;
      this.lineChartData.length = 0;
      return;
    }

    const labelIndex = new Map<string, number>();

    for (const series of seriesList) {
      for (const point of series.data) {
        const normalized = this.normalizePointDate(point?.x);
        if (!normalized) {
          continue;
        }
        if (!labelIndex.has(normalized.label)) {
          labelIndex.set(normalized.label, normalized.order);
        }
      }
    }

    const sortedLabels = Array.from(labelIndex.entries())
      .sort((a, b) => {
        if (a[1] === b[1]) {
          return a[0].localeCompare(b[0]);
        }
        return a[1] - b[1];
      })
      .map(([label]) => label);

    this.lineChartLabels.length = 0;
    this.lineChartData.length = 0;

    if (sortedLabels.length === 0) {
      return;
    }

    this.lineChartLabels.push(...sortedLabels);

    const datasets: ChartDataset<'line'>[] = [];

    seriesList.forEach((series, index) => {
      if (!series.data.length) {
        return;
      }

      const color = this.colorPalette[index % this.colorPalette.length];
      const pointsByLabel = new Map<string, number>();

      for (const point of series.data) {
        const normalized = this.normalizePointDate(point?.x);
        if (!normalized) {
          continue;
        }
        pointsByLabel.set(normalized.label, Number.isFinite(point.y) ? point.y : 0);
      }

      const data = sortedLabels.map((label) => pointsByLabel.get(label) ?? null);

      datasets.push({
        label: series.name || `Series ${index + 1}`,
        data,
        borderColor: color,
        backgroundColor: `${color}33`,
        pointBackgroundColor: color,
        pointBorderColor: color,
        fill: false,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5
      });
    });

    this.lineChartData.push(...datasets);
  }

  private normalizePointDate(value: string | Date | null | undefined): { label: string; order: number } | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(date.getTime())) {
      const iso = date.toISOString();
      const label = iso.split('T')[0] ?? iso;
      return { label, order: date.getTime() };
    }

    const text = String(value);
    return text ? { label: text, order: Number.POSITIVE_INFINITY } : null;
  }
}
