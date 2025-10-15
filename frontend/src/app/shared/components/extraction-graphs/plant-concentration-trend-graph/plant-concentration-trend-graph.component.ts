import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { ExtractionResponse } from '../../../../core/services/api.service';

interface LabeledDate {
  readonly key: number;
  readonly label: string;
}

@Component({
  selector: 'app-extraction-plant-concentration-trend-graph',
  standalone: true,
  imports: [NgChartsModule, CommonModule],
  template: `
    <div class="graph-card">
      <h3>Concentration Trend by Plant</h3>
      @if (isLoading) {
        <p>Loading data...</p>
      } @else if (rows && rows.length > 0) {
        <div class="chart-container">
          <canvas
            baseChart
            [data]="chartData"
            [options]="chartOptions"
            chartType="line"
            (chartClick)="onChartClick($event)">
          </canvas>
        </div>
        @if (selectedRecord; as record) {
          <div class="record-details">
            <div class="details-header">
              <h4>Trend Point Details</h4>
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
                <span class="label">Concentration:</span>
                <span class="value concentration-value">
                  {{ getConcentration(record) | number:'1.0-2' }} g/L
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Volume:</span>
                <span class="value volume-value">
                  {{ getVolume(record) | number:'1.0-2' }} gal
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Weight:</span>
                <span class="value weight-value">
                  {{ getWeightKg(record) | number:'1.0-2' }} kg
                </span>
              </div>
              <div class="detail-item">
                <span class="label">pH:</span>
                <span class="value ph-value">
                  {{ getPh(record) | number:'1.0-2' }}
                </span>
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
export class ExtractionPlantConcentrationTrendGraphComponent implements OnChanges {
  @Input() rows: ExtractionResponse[] | null = null;
  @Input() isLoading = false;

  protected selectedRecord: ExtractionResponse | null = null;
  protected chartData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  protected chartOptions: ChartOptions<'line'> = this.createChartOptions();

  private datasetRecordMatrix: (ExtractionResponse | null)[][] = [];
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnChanges(): void {
    this.updateChartData();
  }

  protected clearSelection(): void {
    this.selectedRecord = null;
    this.cdr.markForCheck();
  }

  protected formatDate(value: string | Date | null | undefined): string {
    if (!value) {
      return 'Unknown';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString();
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

  protected onChartClick(_event: unknown): void {
    // Interactions are handled via chartOptions.onClick.
  }

  private updateChartData(): void {
    if (!this.rows?.length) {
      this.chartData = { labels: [], datasets: [] };
      this.datasetRecordMatrix = [];
      this.selectedRecord = null;
      this.cdr.markForCheck();
      return;
    }

    const validRows = this.rows.filter(row => this.getDateKey(row.date) !== null);
    if (!validRows.length) {
      this.chartData = { labels: [], datasets: [] };
      this.datasetRecordMatrix = [];
      this.selectedRecord = null;
      this.cdr.markForCheck();
      return;
    }

    const labels = this.buildLabels(validRows);
    const plantMaps = this.groupRowsByPlant(validRows);

    const datasets: ChartConfiguration<'line'>['data']['datasets'] = [];
    const recordMatrix: (ExtractionResponse | null)[][] = [];
    let datasetIndex = 0;

    for (const [plant, dateMap] of plantMaps) {
      const recordsForDataset: (ExtractionResponse | null)[] = [];
      const data = labels.map(label => {
        const record = dateMap.get(label.key) ?? null;
        recordsForDataset.push(record);
        return record ? this.getConcentration(record) : 0;
      });

      const hue = (datasetIndex * 137.5) % 360;
      datasets.push({
        label: plant,
        data,
        fill: false,
        borderColor: `hsl(${hue}, 70%, 60%)`,
        backgroundColor: `hsla(${hue}, 70%, 60%, 0.25)`,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35
      });

      recordMatrix.push(recordsForDataset);
      datasetIndex += 1;
    }

    this.datasetRecordMatrix = recordMatrix;
    this.chartData = {
      labels: labels.map(item => item.label),
      datasets
    };

    this.chartOptions = this.createChartOptions();
    this.syncSelection();
    this.cdr.markForCheck();
  }

  private buildLabels(rows: ExtractionResponse[]): LabeledDate[] {
    const uniqueKeys = new Set<number>();
    const mapped: LabeledDate[] = [];

    rows.forEach(row => {
      const key = this.getDateKey(row.date);
      if (key === null || uniqueKeys.has(key)) {
        return;
      }
      uniqueKeys.add(key);
    });

    const sortedKeys = Array.from(uniqueKeys).sort((a, b) => a - b);
    sortedKeys.forEach(key => {
      mapped.push({
        key,
        label: this.formatDate(new Date(key))
      });
    });

    return mapped;
  }

  private groupRowsByPlant(rows: ExtractionResponse[]): Map<string, Map<number, ExtractionResponse>> {
    const plantMap = new Map<string, Map<number, ExtractionResponse>>();

    rows.forEach(row => {
      const plant = row.plant ?? 'Unknown';
      const dateKey = this.getDateKey(row.date);
      if (dateKey === null) {
        return;
      }

      let dateMap = plantMap.get(plant);
      if (!dateMap) {
        dateMap = new Map<number, ExtractionResponse>();
        plantMap.set(plant, dateMap);
      }

      dateMap.set(dateKey, row);
    });

    return plantMap;
  }

  private getDateKey(value: string | Date | null | undefined): number | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return normalized.getTime();
  }

  private createChartOptions(): ChartOptions<'line'> {
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
            label: (context) => {
              const datasetIndex = context.datasetIndex ?? 0;
              const dataIndex = context.dataIndex ?? 0;
              const record = this.datasetRecordMatrix[datasetIndex]?.[dataIndex];
              const value = context.parsed.y ?? 0;

              if (!record) {
                return `${context.dataset.label}: ${value.toFixed(2)} g/L`;
              }

              const volume = this.getVolume(record).toFixed(2);
              const weight = this.getWeightKg(record).toFixed(2);
              const ph = this.getPh(record).toFixed(2);

              return [
                `${context.dataset.label}: ${value.toFixed(2)} g/L`,
                `Volume: ${volume} gal`,
                `Weight: ${weight} kg`,
                `pH: ${ph}`
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
            text: 'Concentration (g/L)',
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
      elements: {
        line: {
          tension: 0.35
        }
      },
      onClick: (_event, elements) => {
        if (!elements.length) {
          return;
        }
        const element = elements[0];
        this.selectRecordByIndex(element.datasetIndex ?? -1, element.index ?? -1);
      }
    };
  }

  private syncSelection(): void {
    if (!this.selectedRecord) {
      return;
    }

    const stillExists = this.datasetRecordMatrix.some(dataset =>
      dataset.some(record => record === this.selectedRecord)
    );

    if (!stillExists) {
      this.selectedRecord = null;
      this.cdr.markForCheck();
    }
  }

  private selectRecordByIndex(datasetIndex: number, dataIndex: number): void {
    if (datasetIndex < 0 || dataIndex < 0) {
      this.selectedRecord = null;
      this.cdr.markForCheck();
      return;
    }

    const record = this.datasetRecordMatrix[datasetIndex]?.[dataIndex] ?? null;
    this.selectedRecord = record;
    this.cdr.markForCheck();
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
