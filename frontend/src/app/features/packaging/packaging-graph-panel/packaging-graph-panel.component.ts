import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { PackagingResponse } from '../../../core/services/api.service';
import { PackagingCartonFlowGraphComponent } from '../../../shared/components/packaging-graphs/carton-flow-graph/carton-flow-graph.component';
import { PackagingProductOutputTrendGraphComponent } from '../../../shared/components/packaging-graphs/product-output-trend-graph/product-output-trend-graph.component';
import { PackagingPlantUtilizationGraphComponent } from '../../../shared/components/packaging-graphs/plant-utilization-graph/plant-utilization-graph.component';
import { PackagingCampaignQualityGraphComponent } from '../../../shared/components/packaging-graphs/campaign-quality-graph/campaign-quality-graph.component';

@Component({
  selector: 'app-packaging-graph-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    PackagingCartonFlowGraphComponent,
    PackagingProductOutputTrendGraphComponent,
    PackagingPlantUtilizationGraphComponent,
    PackagingCampaignQualityGraphComponent
  ],
  templateUrl: './packaging-graph-panel.component.html',
  styleUrl: './packaging-graph-panel.component.css'
})
export class PackagingGraphPanelComponent {
  @Input() rows: PackagingResponse[] | null = null;
  @Input() selectedStatus: 'approved' | 'pending' = 'approved';
  @Input() isLoading: boolean = false;
}
