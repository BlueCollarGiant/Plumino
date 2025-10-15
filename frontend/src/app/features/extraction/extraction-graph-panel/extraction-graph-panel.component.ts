import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgChartsModule } from 'ng2-charts';
import { ExtractionResponse } from '../../../core/services/api.service';
import { ExtractionWeightVolumeGraphComponent } from '../../../shared/components/extraction-graphs/weight-volume-graph/weight-volume-graph.component';
import { ExtractionPlantConcentrationTrendGraphComponent } from '../../../shared/components/extraction-graphs/plant-concentration-trend-graph/plant-concentration-trend-graph.component';
import { ExtractionPlantVolumeGraphComponent } from '../../../shared/components/extraction-graphs/plant-volume-graph/plant-volume-graph.component';
import { ExtractionCampaignPhGraphComponent } from '../../../shared/components/extraction-graphs/campaign-ph-graph/campaign-ph-graph.component';

@Component({
  selector: 'app-extraction-graph-panel',
  standalone: true,
  imports: [
    CommonModule,
    NgChartsModule,
    ExtractionWeightVolumeGraphComponent,
    ExtractionPlantConcentrationTrendGraphComponent,
    ExtractionPlantVolumeGraphComponent,
    ExtractionCampaignPhGraphComponent
  ],
  templateUrl: './extraction-graph-panel.component.html',
  styleUrl: './extraction-graph-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExtractionGraphPanelComponent {
  @Input() rows: ExtractionResponse[] | null = null;
  @Input() selectedStatus: 'approved' | 'pending' = 'approved';
  @Input() isLoading: boolean = false;
}
