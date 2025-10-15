import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ChartDataset, ChartOptions } from 'chart.js';
import { NgChartsModule } from 'ng2-charts';
import { FermentationResponse } from '../../../../core/services/api.service';
import { InputOutputGraphComponent } from '../../../../shared/components/fermentation-graphs/input-output-graph/input-output-graph.component';
import { ProductionTrendGraphComponent } from '../../../../shared/components/fermentation-graphs/production-trend-graph/production-trend-graph.component';
import { PlantUtilizationGraphComponent } from '../../../../shared/components/fermentation-graphs/plant-utilization-graph/plant-utilization-graph.component';
import { CampaignOutputGraphComponent } from '../../../../shared/components/fermentation-graphs/campaign-output-graph/campaign-output-graph.component';

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
  templateUrl: './fermentation-graph-panel.component.html',
  styleUrl: './fermentation-graph-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FermentationGraphPanelComponent {
  @Input() rows: FermentationResponse[] | null = null;
  @Input() selectedStatus: 'approved' | 'pending' = 'approved';
  @Input() isLoading: boolean = false;
}
