import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal, effect, afterNextRender } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { ApiService, DataFilters, ExtractionRequest, ExtractionResponse } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { ExtractionGraphPanelComponent } from './extraction-graph-panel/extraction-graph-panel.component';

type ModalFieldKey =
  | 'date'
  | 'plant'
  | 'product'
  | 'campaign'
  | 'stage'
  | 'tank'
  | 'concentration'
  | 'volume'
  | 'weight'
  | 'levelIndicator'
  | 'pH';

type ModalRow = Partial<Record<ModalFieldKey, unknown>> & {
  readonly _id?: string;
  readonly status?: 'pending' | 'approved';
  readonly createdBy?: string | null;
  readonly createdByRole?: 'operator' | 'supervisor' | 'hr' | 'admin' | null;
};

interface ModalField {
  readonly key: ModalFieldKey;
  readonly label: string;
  readonly type: 'text' | 'number' | 'date';
}

@Component({
  selector: 'app-extraction-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ExtractionGraphPanelComponent],
  templateUrl: './extraction-dashboard.component.html',
  styleUrls: ['./extraction-dashboard.component.css']
})
// Exported: used in app.routes.ts for lazy loading
export class ExtractionDashboardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  // Signals for reactive state management
  protected readonly rows = signal<ExtractionResponse[]>([]);
  readonly selectedStatus = signal<'approved' | 'pending'>('approved');
  protected readonly filteredRows = computed(() => {
    const allRows = this.rows();
    const status = this.selectedStatus();

    const baselineRows = allRows.filter(row => row.status === 'approved' || !row.status);
    if (status === 'pending') {
      const pendingRows = allRows.filter(row => row.status === 'pending');
      return [...baselineRows, ...pendingRows];
    }

    return baselineRows;
  });
  protected readonly isLoading = signal(false);
  protected readonly userRole = signal<string>('');
  protected readonly userId = signal<string>('');
  protected readonly isOperator = computed(() => this.userRole() === 'operator');
  protected readonly isSupervisorOrHigher = computed(() => {
    const role = this.userRole();
    return role === 'supervisor' || role === 'hr' || role === 'admin';
  });
  protected readonly editingRow = signal<ModalRow | null>(null);
  protected readonly isMutating = signal(false);
  protected readonly mutationError = signal<string | null>(null);

  // Form signals
  protected readonly filterForm = this.fb.nonNullable.group({
    date: '',
    plant: '',
    product: '',
    campaign: '',
    stage: ''
  });

  protected readonly editForm = this.fb.group({
    date: ['', Validators.required],
    plant: ['', Validators.required],
    product: ['', Validators.required],
    campaign: ['', Validators.required],
    stage: ['', Validators.required],
    tank: ['', Validators.required],
    concentration: [null as number | null, [Validators.required, Validators.min(0.0000001)]],
    volume: [null as number | null, [Validators.required, Validators.min(0.0000001)]],
    weight: [null as number | null, [Validators.required, Validators.min(0.0000001)]],
    levelIndicator: ['', Validators.required],
    pH: [null as number | null, [Validators.required, Validators.min(0), Validators.max(14)]]
  });

  // Quick add controls for inline table entry
  protected readonly quickAddControls = {
    date: new FormControl('', Validators.required),
    plant: new FormControl('', Validators.required),
    product: new FormControl('', Validators.required),
    campaign: new FormControl('', Validators.required),
    stage: new FormControl('', Validators.required),
    tank: new FormControl('', Validators.required),
    concentration: new FormControl(null as number | null, [Validators.required, Validators.min(0.0000001)]),
    volume: new FormControl(null as number | null, [Validators.required, Validators.min(0.0000001)]),
    weight: new FormControl(null as number | null, [Validators.required, Validators.min(0.0000001)]),
    levelIndicator: new FormControl('', Validators.required),
    pH: new FormControl(null as number | null, [Validators.required, Validators.min(0), Validators.max(14)])
  };

  protected readonly isQuickSaving = signal(false);
  protected readonly quickSaveError = signal<string | null>(null);

  protected canQuickSave(): boolean {
    const controls = this.quickAddControls;
    const dateValue = controls.date.value;
    const plantValue = controls.plant.value;
    const productValue = controls.product.value;
    const campaignValue = controls.campaign.value;
    const stageValue = controls.stage.value;
    const tankValue = controls.tank.value;
    const concentrationValue = controls.concentration.value;
    const volumeValue = controls.volume.value;
    const weightValue = controls.weight.value;
    const levelIndicatorValue = controls.levelIndicator.value;
    const pHValue = controls.pH.value;

    return !this.isQuickSaving() &&
           !!dateValue &&
           !!plantValue &&
           !!productValue &&
           !!campaignValue &&
           !!stageValue &&
           !!tankValue &&
           concentrationValue !== null && concentrationValue !== undefined && concentrationValue > 0 &&
           volumeValue !== null && volumeValue !== undefined && volumeValue > 0 &&
           weightValue !== null && weightValue !== undefined && weightValue > 0 &&
           !!levelIndicatorValue &&
           pHValue !== null && pHValue !== undefined && pHValue >= 0 && pHValue <= 14;
  }

  // Computed signals for derived state
  protected readonly canSubmitEdit = computed(() => {
    const row = this.editingRow();
    if (!row || !row._id) {
      return false;
    }
    return this.canEditRow(row) && !this.isMutating() && this.editForm.valid;
  });
  protected readonly canDelete = computed(() => {
    const row = this.editingRow();
    if (!row || !row._id) {
      return false;
    }
    return this.canDeleteRow(row) && !this.isMutating();
  });

  protected readonly modalFields: readonly ModalField[] = [
    { key: 'date', label: 'Date', type: 'date' },
    { key: 'plant', label: 'Plant', type: 'text' },
    { key: 'product', label: 'Product', type: 'text' },
    { key: 'campaign', label: 'Campaign', type: 'text' },
    { key: 'stage', label: 'Stage', type: 'text' },
    { key: 'tank', label: 'Tank', type: 'text' },
    { key: 'concentration', label: 'Concentration (g/l)', type: 'number' },
    { key: 'volume', label: 'Volume (gal)', type: 'number' },
    { key: 'weight', label: 'Weight (kg)', type: 'number' },
    { key: 'levelIndicator', label: 'Level Indicator', type: 'text' },
    { key: 'pH', label: 'pH', type: 'number' }
  ] as const;

  protected readonly stats = computed(() => {
    const data = this.rows();
    if (!data.length) {
      return {
        avgConcentration: 0,
        totalVolume: 0,
        totalWeight: 0,
        avgPh: 0
      } as const;
    }

    const totals = data.reduce(
      (acc, item) => {
        acc.sumConcentration += item.concentration ?? 0;
        if (item.concentration !== undefined && item.concentration !== null) {
          acc.countConcentration += 1;
        }
        acc.totalVolume += item.volume ?? 0;
        acc.totalWeight += item.weight ?? 0;
        if (item.pH !== undefined && item.pH !== null) {
          acc.sumPh += item.pH;
          acc.countPh += 1;
        }
        return acc;
      },
      { sumConcentration: 0, countConcentration: 0, totalVolume: 0, totalWeight: 0, sumPh: 0, countPh: 0 }
    );

    return {
      avgConcentration: totals.countConcentration ? totals.sumConcentration / totals.countConcentration : 0,
      totalVolume: totals.totalVolume,
      totalWeight: totals.totalWeight,
      avgPh: totals.countPh ? totals.sumPh / totals.countPh : 0
    } as const;
  });

  public toggleStatus(mode: 'approved' | 'pending'): void {
    this.selectedStatus.set(mode);
  }

  protected resolveStatus(row: ExtractionResponse | ModalRow | null | undefined): 'pending' | 'approved' {
    return row?.status === 'approved' ? 'approved' : 'pending';
  }

  private resolveCreatorRole(row: ExtractionResponse | ModalRow | null | undefined): 'operator' | 'supervisor' | 'hr' | 'admin' | null {
    if (!row) {
      return null;
    }
    if (row.createdByRole) {
      return row.createdByRole;
    }
    return row.createdBy ? 'operator' : null;
  }

  protected canEditRow(row: ExtractionResponse | ModalRow | null | undefined): boolean {
    if (!row?._id) {
      return false;
    }

    const status = this.resolveStatus(row);
    const creatorRole = this.resolveCreatorRole(row);
    const currentUserId = this.userId();

    if (this.isOperator()) {
      return status === 'pending' && !!row.createdBy && row.createdBy === currentUserId;
    }

    if (this.isSupervisorOrHigher()) {
      if (creatorRole && creatorRole !== 'operator') {
        return false;
      }
      return true;
    }

    return false;
  }

  protected canDeleteRow(row: ExtractionResponse | ModalRow | null | undefined): boolean {
    if (!row?._id) {
      return false;
    }

    const status = this.resolveStatus(row);
    const creatorRole = this.resolveCreatorRole(row);
    const currentUserId = this.userId();

    if (this.isOperator()) {
      return status === 'pending' && !!row.createdBy && row.createdBy === currentUserId;
    }

    if (this.isSupervisorOrHigher()) {
      if (creatorRole && creatorRole !== 'operator') {
        return false;
      }
      return true;
    }

    return false;
  }

  protected canApproveRow(row: ExtractionResponse | null | undefined): boolean {
    if (!row?._id) {
      return false;
    }

    if (!this.isSupervisorOrHigher()) {
      return false;
    }

    return this.resolveStatus(row) === 'pending';
  }

  // Effects for side effects
  private readonly syncUserEffect = effect(() => {
    const employee = this.authService.employee();
    this.userRole.set(employee?.role ?? '');
    this.userId.set(employee?.id ?? '');
  }, { allowSignalWrites: true });

  constructor() {
    // React to filter form changes with debounced loading - moved out of effect for better performance
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        takeUntilDestroyed()
      )
      .subscribe(() => this.loadData());

    // Initial data load with SSR safety
    afterNextRender(() => {
      this.loadData();
    });
  }

  protected onSubmit(): void {
    this.loadData();
  }

  protected resetFilters(): void {
    this.filterForm.reset({ date: '', plant: '', product: '', campaign: '', stage: '' });
    this.loadData();
  }

  protected quickSave(): void {
    if (!this.canQuickSave()) {
      Object.values(this.quickAddControls).forEach(control => control.markAsTouched());
      return;
    }

    const formData = {
      date: this.quickAddControls.date.value,
      plant: this.quickAddControls.plant.value,
      product: this.quickAddControls.product.value,
      campaign: this.quickAddControls.campaign.value,
      stage: this.quickAddControls.stage.value,
      tank: this.quickAddControls.tank.value,
      concentration: this.quickAddControls.concentration.value,
      volume: this.quickAddControls.volume.value,
      weight: this.quickAddControls.weight.value,
      levelIndicator: this.quickAddControls.levelIndicator.value,
      pH: this.quickAddControls.pH.value
    };

    let payload: ExtractionRequest;
    try {
      payload = this.buildExtractionPayloadFromQuickAdd(formData);
    } catch (err) {
      console.error('Unable to prepare quick add payload', err);
      this.quickSaveError.set('Unable to prepare data.');
      return;
    }

    this.isQuickSaving.set(true);
    this.quickSaveError.set(null);

    this.apiService
      .addExtractionEntry(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newRecord: ExtractionResponse) => {
          // Reload data to ensure UI shows correct filtered dataset
          this.loadData();
          this.resetQuickAddForm();
          this.isQuickSaving.set(false);
        },
        error: (err: any) => {
          console.error('Failed to add extraction record', err);
          this.isQuickSaving.set(false);
          this.quickSaveError.set('Failed to add record.');
        }
      });
  }

  protected resetQuickAddForm(): void {
    Object.values(this.quickAddControls).forEach(control => {
      control.reset();
      control.markAsUntouched();
    });
  }

  protected openEditModal(row: ExtractionResponse): void {
    if (!this.canEditRow(row)) {
      return;
    }

    this.mutationError.set(null);
    this.isMutating.set(false);

    this.editForm.reset({
      date: this.normalizeDateValue(row.date),
      plant: row.plant ?? '',
      product: row.product ?? '',
      campaign: row.campaign ?? '',
      stage: row.stage ?? '',
      tank: row.tank ?? '',
      concentration: this.coerceNumber(row.concentration),
      volume: this.coerceNumber(row.volume),
      weight: this.coerceNumber(row.weight),
      levelIndicator: row.levelIndicator ?? '',
      pH: this.coerceNumber(row.pH)
    });

    this.editingRow.set({ ...row });
  }

  protected closeEditModal(): void {
    this.editForm.reset();
    this.editingRow.set(null);
  }

  protected submitEdit(): void {
    const current = this.editingRow();

    if (!current?._id) {
      console.warn('Attempted to save extraction without an identifier.');
      return;
    }

    if (!this.canEditRow(current)) {
      this.mutationError.set('You are not allowed to edit this record.');
      return;
    }

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    let payload: ExtractionRequest;
    try {
      payload = this.buildExtractionPayload();
    } catch (err) {
      this.mutationError.set('Unable to prepare extraction payload.');
      return;
    }

    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .updateExtraction(current._id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          // Reload data to ensure UI shows correct filtered dataset
          this.loadData();
          this.isMutating.set(false);
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Failed to update extraction record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to update extraction record.');
        }
      });
  }

  protected deleteCurrentRow(): void {
    const current = this.editingRow();

    if (!current?._id) {
      console.warn('Attempted to delete extraction without an identifier.');
      return;
    }

    if (!this.canDeleteRow(current)) {
      this.mutationError.set('You are not allowed to delete this record.');
      return;
    }

    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .deleteExtraction(current._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.rows.update((rows) => rows.filter((item) => item._id !== current._id));
          this.isMutating.set(false);
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Failed to delete extraction record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to delete extraction record.');
        }
      });
  }

  protected approveRecord(row: ExtractionResponse): void {
    if (!row._id) {
      console.warn('Attempted to approve extraction without an identifier.');
      return;
    }

    if (!this.canApproveRow(row)) {
      return;
    }

    // Set loading state
    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .approveExtraction(row._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          console.log('Extraction approved successfully:', updated);

          // Update the specific row in the local state
          this.rows.update((rows) =>
            rows.map((item) => (item._id === updated._id ? { ...item, ...updated } : item))
          );

          // Reload data to ensure UI is in sync with backend
          this.loadData();

          // Clear loading state
          this.isMutating.set(false);

          // Provide success feedback
          this.toastService.show('Extraction record approved successfully', 'success');
        },
        error: (err) => {
          console.error('Failed to approve extraction record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to approve extraction record.');
          this.toastService.show('Failed to approve extraction record', 'error');
        }
      });
  }

  private buildExtractionPayload(): ExtractionRequest {
    const raw = this.editForm.getRawValue();
    const dateValue = raw.date ?? '';
    const parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date provided');
    }

    return {
      date: parsedDate.toISOString(),
      plant: raw.plant ?? '',
      product: raw.product ?? '',
      campaign: raw.campaign ?? '',
      stage: raw.stage ?? '',
      tank: raw.tank ?? '',
      concentration: Number(raw.concentration),
      volume: Number(raw.volume),
      weight: Number(raw.weight),
      levelIndicator: raw.levelIndicator ?? '',
      pH: Number(raw.pH)
    };
  }

  private buildExtractionPayloadFromQuickAdd(formData: any): ExtractionRequest {
    const parsedDate = new Date(formData.date);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date provided');
    }

    return {
      date: parsedDate.toISOString(),
      plant: formData.plant ?? '',
      product: formData.product ?? '',
      campaign: formData.campaign ?? '',
      stage: formData.stage ?? '',
      tank: formData.tank ?? '',
      concentration: Number(formData.concentration),
      volume: Number(formData.volume),
      weight: Number(formData.weight),
      levelIndicator: formData.levelIndicator ?? '',
      pH: Number(formData.pH)
    };
  }

  private normalizeDateValue(value: ModalRow['date']): string {
    if (!value) {
      return '';
    }

    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? '' : value.toISOString().split('T')[0];
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    }

    return '';
  }

  private coerceNumber(value: unknown): number | null {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private buildFilters(): DataFilters {
    const raw = this.filterForm.getRawValue();
    const filters: DataFilters = {};

    Object.entries(raw).forEach(([key, value]) => {
      if (value) {
        filters[key as keyof DataFilters] = value;
      }
    });

    return filters;
  }

  private loadData(): void {
    this.isLoading.set(true);
    const filters = this.buildFilters();

    this.apiService
      .getExtractionData(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.rows.set(Array.isArray(data) ? data : []);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load extraction data', err);
          this.rows.set([]);
          this.isLoading.set(false);
        }
      });
  }
}
