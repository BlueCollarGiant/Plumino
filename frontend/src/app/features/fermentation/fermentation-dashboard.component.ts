import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { ApiService, DataFilters, FermentationRequest, FermentationResponse } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { FermentationGraphPanelComponent } from './fermentation-graph-panel/fermentation-graph-panel.component';


type ModalFieldKey =
  | 'date'
  | 'plant'
  | 'product'
  | 'campaign'
  | 'stage'
  | 'tank'
  | 'levelIndicator'
  | 'weight'
  | 'receivedAmount'
  ;

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

type FermentationFormValue = Record<ModalFieldKey, unknown>;


@Component({
  selector: 'app-fermentation-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FermentationGraphPanelComponent],
  templateUrl: './fermentation-dashboard.component.html',
  styleUrls: ['./fermentation-dashboard.component.css']
})
// Exported: used in app.routes.ts for lazy loading
export class FermentationDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterForm = this.fb.nonNullable.group({
    date: '',
    plant: '',
    product: '',
    stage: '',
    campaign: ''
  });

  protected readonly rows = signal<FermentationResponse[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly userRole = signal<string>('');
  protected readonly userId = signal<string>('');
  readonly selectedStatus = signal<'approved' | 'pending'>('approved');
  protected readonly isOperator = computed(() => this.userRole() === 'operator');
  protected readonly isSupervisorOrHigher = computed(() => {
    const role = this.userRole();
    return role === 'supervisor' || role === 'hr' || role === 'admin';
  });

  private readonly syncUserEffect = effect(() => {
    const employee = this.authService.employee();
    this.userRole.set(employee?.role ?? '');
    this.userId.set(employee?.id ?? '');
  }, { allowSignalWrites: true });

  protected readonly editingRow = signal<ModalRow | null>(null);

  protected readonly editForm = this.fb.group({
    date: ['', Validators.required],
    plant: ['', Validators.required],
    product: ['', Validators.required],
    campaign: ['', Validators.required],
    stage: ['', Validators.required],
    tank: ['', Validators.required],
    levelIndicator: ['', Validators.required],
    weight: [null as number | null, [Validators.required, Validators.min(0)]],
    receivedAmount: [null as number | null, [Validators.required, Validators.min(0)]]
  });

  protected readonly isMutating = signal(false);
  protected readonly mutationError = signal<string | null>(null);

  // Quick add controls for inline table entry
  protected readonly quickAddControls = {
    date: new FormControl('', Validators.required),
    plant: new FormControl('', Validators.required),
    product: new FormControl('', Validators.required),
    campaign: new FormControl('', Validators.required),
    stage: new FormControl('', Validators.required),
    tank: new FormControl('', Validators.required),
    levelIndicator: new FormControl('', Validators.required),
    weight: new FormControl(null as number | null, [Validators.required, Validators.min(0)]),
    receivedAmount: new FormControl(null as number | null, [Validators.required, Validators.min(0)])
  };

  protected readonly isQuickSaving = signal(false);
  protected readonly quickSaveError = signal<string | null>(null);

  protected canQuickSave(): boolean {
    // Method gets called on every change detection cycle
    const controls = this.quickAddControls;
    const dateValue = controls.date.value;
    const plantValue = controls.plant.value;
    const productValue = controls.product.value;
    const campaignValue = controls.campaign.value;
    const stageValue = controls.stage.value;
    const tankValue = controls.tank.value;
    const levelIndicatorValue = controls.levelIndicator.value;
    const weightValue = controls.weight.value;
    const receivedAmountValue = controls.receivedAmount.value;

    return !this.isQuickSaving() &&
      !!dateValue &&
      !!plantValue &&
      !!productValue &&
      !!campaignValue &&
      !!stageValue &&
      !!tankValue &&
      !!levelIndicatorValue &&
      weightValue !== null && weightValue !== undefined && weightValue >= 0 &&
      receivedAmountValue !== null && receivedAmountValue !== undefined && receivedAmountValue >= 0;
  }

  // Computed signals for derived state
  protected readonly recordCount = computed(() => this.rows().length);
  protected readonly isModalOpen = computed(() => !!this.editingRow());
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
    { key: 'levelIndicator', label: 'Level Indicator', type: 'text' },
    { key: 'weight', label: 'Weight (lbs)', type: 'number' },
    { key: 'receivedAmount', label: 'Received (lbs)', type: 'number' }
  ] as const;

  protected readonly stats = computed(() => {
    const data = this.rows();
    if (!data.length) {
      return {
        totalWeight: 0,
        totalReceived: 0,
        avgLevelIndicator: 0
      } as const;
    }

    const totals = data.reduce(
      (acc, item) => {
        acc.totalWeight += this.resolveNumber(item.weightLbs, item.weight);
        acc.totalReceived += this.resolveNumber(item.receivedAmountLbs, item.receivedAmount);

        const numericIndicator = this.parseLevelIndicator(item.levelIndicator);
        if (numericIndicator !== null) {
          acc.levelSum += numericIndicator;
          acc.levelCount += 1;
        }
        return acc;
      },
      { totalWeight: 0, totalReceived: 0, levelSum: 0, levelCount: 0 }
    );

    return {
      totalWeight: totals.totalWeight,
      totalReceived: totals.totalReceived,
      avgLevelIndicator: totals.levelCount ? totals.levelSum / totals.levelCount : 0
    } as const;
  });

  protected readonly filteredRows = computed(() => {
    const allRows = this.rows();
    const status = this.selectedStatus();

    // Treat rows with no status (legacy data) as part of the approved baseline
    const baselineRows = allRows.filter(row => row.status === 'approved' || !row.status);
    if (status === 'pending') {
      const pendingRows = allRows.filter(row => row.status === 'pending');
      return [...baselineRows, ...pendingRows];
    }

    return baselineRows;
  });

  protected readonly chartData = computed<readonly FermentationChartSeries[]>(() => {
    const allRows = this.rows();

    // Always include all approved or legacy rows as the baseline
    const baselineRows = allRows.filter(row => row.status === 'approved' || !row.status);

    // When pending is selected, also include pending rows
    const pendingRows = this.selectedStatus() === 'pending'
      ? allRows.filter(row => row.status === 'pending')
      : [];

    // Merge baseline and pending data (baseline first, then pending to prevent duplicates)
    const mergedRows = [...baselineRows, ...pendingRows];

    const chartData = buildFermentationChartData(
      mergedRows,
      (primary, fallback) => this.resolveNumber(primary, fallback)
    );

    return chartData;
  });

  public toggleStatus(mode: 'approved' | 'pending'): void {
    this.selectedStatus.set(mode);
  }

  protected resolveStatus(row: FermentationResponse | ModalRow | null | undefined): 'pending' | 'approved' {
    return row?.status === 'approved' ? 'approved' : 'pending';
  }

  private resolveCreatorRole(row: FermentationResponse | ModalRow | null | undefined): 'operator' | 'supervisor' | 'hr' | 'admin' | null {
    if (!row) {
      return null;
    }
    if (row.createdByRole) {
      return row.createdByRole;
    }
    return row.createdBy ? 'operator' : null;
  }

  protected canEditRow(row: FermentationResponse | ModalRow | null | undefined): boolean {
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

  protected canDeleteRow(row: FermentationResponse | ModalRow | null | undefined): boolean {
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

  protected canApproveRow(row: FermentationResponse | null | undefined): boolean {
    if (!row?._id || !this.isSupervisorOrHigher()) {
      return false;
    }

    if (this.resolveStatus(row) !== 'pending') {
      return false;
    }

    const creatorRole = this.resolveCreatorRole(row);
    return !creatorRole || creatorRole === 'operator';
  }

  // Effects for side effects management
  private readonly filterChangesEffect = effect(() => {
    // React to filter form changes with debounced loading
    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData());
  });

  private readonly modalStateEffect = effect(() => {
    // Clear mutation errors when modal opens/closes
    const isOpen = this.isModalOpen();
    if (!isOpen) {
      this.mutationError.set(null);
      this.isMutating.set(false);
    }
  });

  private readonly loadingStateEffect = effect(() => {
    // Trigger on loading state changes
    this.isLoading();
    this.recordCount();
  }, { allowSignalWrites: false });

  ngOnInit(): void {
    this.loadData();
  }

  protected onSubmit(): void {
    this.loadData();
  }

  protected resetFilters(): void {
    this.filterForm.reset({ date: '', plant: '', product: '', stage: '', campaign: '' });
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
      levelIndicator: this.quickAddControls.levelIndicator.value,
      weight: this.quickAddControls.weight.value,
      receivedAmount: this.quickAddControls.receivedAmount.value
    };

    let payload: FermentationRequest;
    try {
      payload = this.buildFermentationPayloadFromRaw(formData as FermentationFormValue);
    } catch (err) {
      this.quickSaveError.set('Unable to prepare data.');
      return;
    }

    this.isQuickSaving.set(true);
    this.quickSaveError.set(null);

    this.apiService
      .addFermentationEntry(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newRecord) => {
          // Reload data to ensure UI shows correct filtered dataset
          this.loadData();
          this.resetQuickAddForm();
          this.isQuickSaving.set(false);
        },
        error: (err) => {
          console.error('Failed to add fermentation record', err);
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

  protected openEditModal(row: FermentationResponse): void {
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
      levelIndicator: row.levelIndicator ?? '',
      weight: this.coerceNumber(row.weightLbs ?? row.weight),
      receivedAmount: this.coerceNumber(row.receivedAmountLbs ?? row.receivedAmount)
    });

    this.editingRow.set({ ...row });
  }

  protected closeEditModal(): void {
    this.editForm.reset();
    this.editingRow.set(null);
    this.mutationError.set(null);
    this.isMutating.set(false);
  }

  protected submitEdit(): void {
    const current = this.editingRow();

    if (!current?._id) {
      console.warn('Attempted to save fermentation record without an identifier.');
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

    let payload: FermentationRequest;
    try {
      payload = this.buildFermentationPayload();
    } catch (err) {
      this.mutationError.set('Unable to prepare fermentation payload.');
      return;
    }

    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .updateFermentation(current._id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          // Reload data to ensure UI shows correct filtered dataset
          this.loadData();
          this.isMutating.set(false);
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Failed to update fermentation record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to update fermentation record.');
        }
      });
  }

  protected deleteCurrentRow(): void {
    const current = this.editingRow();

    if (!current?._id) {
      console.warn('Attempted to delete fermentation record without an identifier.');
      return;
    }

    if (!this.canDeleteRow(current)) {
      this.mutationError.set('You are not allowed to delete this record.');
      return;
    }

    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .deleteFermentation(current._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.rows.update((rows) => rows.filter((item) => item._id !== current._id));
          this.isMutating.set(false);
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Failed to delete fermentation record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to delete fermentation record.');
        }
      });
  }

  protected approveRecord(row: FermentationResponse): void {
    if (!row._id) {
      console.warn('Attempted to approve fermentation record without an identifier.');
      return;
    }

    if (!this.canApproveRow(row)) {
      return;
    }

    // Set loading state
    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .approveFermentation(row._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          // Update the specific row in the local state
          this.rows.update((rows) =>
            rows.map((item) => (item._id === updated._id ? { ...item, ...updated } : item))
          );

          // Reload data to ensure UI is in sync with backend
          this.loadData();

          // Clear loading state
          this.isMutating.set(false);

          // Provide success feedback
          this.toastService.show('Fermentation record approved successfully', 'success');
        },
        error: (err) => {
          console.error('❌ Failed to approve fermentation record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to approve fermentation record.');
          this.toastService.show('Failed to approve fermentation record', 'error');
        }
      });
  }

  private buildFermentationPayload(): FermentationRequest {
    return this.buildFermentationPayloadFromRaw(this.editForm.getRawValue() as FermentationFormValue);
  }

  private buildFermentationPayloadFromRaw(raw: FermentationFormValue): FermentationRequest {
    const normalizedDate = this.normalizeDateValue(raw.date);

    if (!normalizedDate) {
      throw new Error('Invalid date provided');
    }

    const parsedDate = new Date(normalizedDate);
    const weight = this.coerceNumber(raw.weight);
    const receivedAmount = this.coerceNumber(raw.receivedAmount);

    if (weight === null || receivedAmount === null) {
      throw new Error('Invalid weight or received amount');
    }

    return {
      date: parsedDate.toISOString(),
      plant: this.coerceString(raw.plant),
      product: this.coerceString(raw.product),
      campaign: this.coerceString(raw.campaign),
      stage: this.coerceString(raw.stage),
      tank: this.coerceString(raw.tank),
      levelIndicator: this.coerceString(raw.levelIndicator),
      weight,
      receivedAmount
    };
  }

  private normalizeDateValue(value: unknown): string {
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

    if (typeof value === 'string') {
      const normalized = value.replace(/[^0-9.-]/g, '');
      if (!normalized) {
        return null;
      }
      const parsedValue = Number(normalized);
      return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private coerceString(value: unknown): string {
    if (typeof value === 'string') {
      return value.trim();
    }
    return '';
  }
  protected resolveNumber(primary?: number | null, fallback?: number | null): number {
    return (primary ?? fallback ?? 0) as number;
  }

  private parseLevelIndicator(value?: string | null): number | null {
    if (!value) {
      return null;
    }
    const numeric = Number(value.replace(/[^0-9.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
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
      .getFermentationData(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.rows.set(Array.isArray(data) ? data : []);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load fermentation data', err);
          this.rows.set([]);
          this.isLoading.set(false);
        }
      });
  }
}

interface FermentationChartSeries {
  readonly name: string;
  readonly data: { readonly x: string | Date; readonly y: number }[];
}

/**
 * Builds a multi-series fermentation yield dataset grouped by plant for line charts.
 */
function buildFermentationChartData(
  rows: readonly FermentationResponse[],
  resolveNumberFn: (primary?: number | null, fallback?: number | null) => number = (primary, fallback) => (primary ?? fallback ?? 0)
): FermentationChartSeries[] {
  const grouped = new Map<string, { x: Date; y: number }[]>();

  for (const row of rows) {
    if (!row) {
      continue;
    }

    const normalizedDate = row.date ? new Date(row.date) : null;
    if (!normalizedDate || Number.isNaN(normalizedDate.getTime())) {
      continue;
    }

    const plantName = row.plant?.trim() || 'Unknown';
    const fallbackReceived = (row as { received?: number | null }).received;
    const weight = resolveNumberFn(row.weightLbs, row.weight);
    const received = resolveNumberFn(
      row.receivedAmountLbs ?? fallbackReceived,
      row.receivedAmount ?? fallbackReceived
    );
    const yieldPercent = weight > 0 ? (received / weight) * 100 : 0;

    if (grouped.has(plantName)) {
      grouped.get(plantName)!.push({ x: normalizedDate, y: yieldPercent });
    } else {
      grouped.set(plantName, [{ x: normalizedDate, y: yieldPercent }]);
    }
  }

  const result = Array.from(grouped.entries()).map(([name, data]) => ({
    name,
    data: [...data].sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime())
  }));

  return result;
}

/* Added manual entry form with API create hook, toggled visibility, and refresh wiring. */
