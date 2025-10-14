import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ChartDataset, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { FermentationResponse } from '../../../core/services/api.service';
import { InputOutputGraphComponent } from '../input-output-graph/input-output-graph.component';
import { ProductionTrendGraphComponent } from '../production-trend-graph/production-trend-graph.component';
import { PlantUtilizationGraphComponent } from '../plant-utilization-graph/plant-utilization-graph.component';
import { CampaignOutputGraphComponent } from '../campaign-output-graph/campaign-output-graph.component';

export interface FermentationChartSeries {
  readonly name: string;
  readonly data: ReadonlyArray<{ readonly x: string | Date; readonly y: number }>;
}

@Component({
  selector: 'app-fermentation-graph-panel',
  standalone: true,
  imports: [
    CommonModule,
    NgChartsModule,
    InputOutputGraphComponent,
    ProductionTrendGraphComponent,
    PlantUtilizationGraphComponent,
    CampaignOutputGraphComponent
  ],
  templateUrl: './fermentation-yield-graph.component.html',
  styleUrl: './fermentation-yield-graph.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FermentationGraphPanelComponent {
  @Input() rows: FermentationResponse[] | null = null;
  @Input() selectedStatus: 'approved' | 'pending' = 'approved';
  @Input() isLoading: boolean = false;
}
