import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime } from 'rxjs';

import { ApiService, PackagingFilters, PackagingRequest, PackagingResponse } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PackagingGraphPanelComponent } from './packaging-graph-panel/packaging-graph-panel.component';

type ModalFieldKey =
  | 'date'
  | 'plant'
  | 'product'
  | 'campaign'
  | 'packageType'
  | 'incomingAmountKg'
  | 'outgoingAmountKg';

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
  selector: 'app-packaging-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PackagingGraphPanelComponent],
  templateUrl: './packaging-dashboard.component.html',
  styleUrls: ['./packaging-dashboard.component.css']
})
// Exported: used in app.routes.ts for lazy loading
export class PackagingDashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterForm = this.fb.nonNullable.group({
    date: '',
    plant: '',
    product: '',
    packageType: '',
    campaign: ''
  });

  protected readonly rows = signal<PackagingResponse[]>([]);
  readonly selectedStatus = signal<'approved' | 'pending'>('approved');
  protected readonly filteredRows = computed(() => {
    const allRows = this.rows();
    const status = this.selectedStatus();

    const approvedRows = allRows.filter(row => row.status === 'approved' || !row.status);
    if (status === 'pending') {
      const pendingRows = allRows.filter(row => row.status === 'pending');
      return [...approvedRows, ...pendingRows];
    }

    return approvedRows;
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

  protected readonly editForm = this.fb.group({
    date: ['', Validators.required],
    plant: ['', Validators.required],
    product: ['', Validators.required],
    campaign: ['', Validators.required],
    packageType: ['', Validators.required],
    incomingAmountKg: [null as number | null, [Validators.required, Validators.min(0.0000001)]],
    outgoingAmountKg: [null as number | null, [Validators.required, Validators.min(0.0000001)]]
  });

  // Quick add controls for inline table entry
  protected readonly quickAddControls = {
    date: new FormControl('', Validators.required),
    plant: new FormControl('', Validators.required),
    product: new FormControl('', Validators.required),
    campaign: new FormControl('', Validators.required),
    packageType: new FormControl('', Validators.required),
    incomingAmountKg: new FormControl(null as number | null, [Validators.required, Validators.min(0.0000001)]),
    outgoingAmountKg: new FormControl(null as number | null, [Validators.required, Validators.min(0.0000001)])
  };

  protected readonly isQuickSaving = signal(false);
  protected readonly quickSaveError = signal<string | null>(null);

  protected canQuickSave(): boolean {
    const controls = this.quickAddControls;
    const dateValue = controls.date.value;
    const plantValue = controls.plant.value;
    const productValue = controls.product.value;
    const campaignValue = controls.campaign.value;
    const packageTypeValue = controls.packageType.value;
    const incomingValue = controls.incomingAmountKg.value;
    const outgoingValue = controls.outgoingAmountKg.value;

    return !this.isQuickSaving() &&
           !!dateValue &&
           !!plantValue &&
           !!productValue &&
           !!campaignValue &&
           !!packageTypeValue &&
           incomingValue !== null && incomingValue !== undefined && incomingValue > 0 &&
           outgoingValue !== null && outgoingValue !== undefined && outgoingValue > 0;
  }

  protected readonly isMutating = signal(false);
  protected readonly mutationError = signal<string | null>(null);

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
    { key: 'packageType', label: 'Package', type: 'text' },
    { key: 'incomingAmountKg', label: 'Incoming (kg)', type: 'number' },
    { key: 'outgoingAmountKg', label: 'Outgoing (kg)', type: 'number' }
  ] as const;

  protected readonly stats = computed(() => {
    const data = this.rows();
    if (!data.length) {
      return {
        totalIncoming: 0,
        totalOutgoing: 0,
        net: 0
      } as const;
    }

    const totals = data.reduce(
      (acc, item) => {
        acc.totalIncoming += item.incomingAmountKg ?? 0;
        acc.totalOutgoing += item.outgoingAmountKg ?? 0;
        return acc;
      },
      { totalIncoming: 0, totalOutgoing: 0 }
    );

    return {
      totalIncoming: totals.totalIncoming,
      totalOutgoing: totals.totalOutgoing,
      net: totals.totalIncoming - totals.totalOutgoing
    } as const;
  });

  protected resolveStatus(row: PackagingResponse | ModalRow | null | undefined): 'pending' | 'approved' {
    return row?.status === 'approved' ? 'approved' : 'pending';
  }

  private resolveCreatorRole(row: PackagingResponse | ModalRow | null | undefined): 'operator' | 'supervisor' | 'hr' | 'admin' | null {
    if (!row) {
      return null;
    }
    if (row.createdByRole) {
      return row.createdByRole;
    }
    return row.createdBy ? 'operator' : null;
  }

  protected canEditRow(row: PackagingResponse | ModalRow | null | undefined): boolean {
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

  protected canDeleteRow(row: PackagingResponse | ModalRow | null | undefined): boolean {
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

  protected canApproveRow(row: PackagingResponse | null | undefined): boolean {
    if (!row?._id || !this.isSupervisorOrHigher()) {
      return false;
    }

    if (this.resolveStatus(row) !== 'pending') {
      return false;
    }

    const creatorRole = this.resolveCreatorRole(row);
    return !creatorRole || creatorRole === 'operator';
  }

  private readonly syncUserEffect = effect(() => {
    const employee = this.authService.employee();
    this.userRole.set(employee?.role ?? '');
    this.userId.set(employee?.id ?? '');
  }, { allowSignalWrites: true });

  // Effects for side effects management
  private readonly filterChangesEffect = effect(() => {
    // React to filter form changes with debounced loading
    this.filterForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadData());
  }, { allowSignalWrites: false });

  private readonly modalStateEffect = effect(() => {
    // Clear mutation errors when modal opens/closes
    const isOpen = this.isModalOpen();
    if (!isOpen) {
      this.mutationError.set(null);
      this.isMutating.set(false);
    }
  }, { allowSignalWrites: false });

  private readonly loadingStateEffect = effect(() => {
    // Log loading state changes for debugging
    const loading = this.isLoading();
    const count = this.recordCount();
    if (!loading && count > 0) {
      console.debug(`Loaded ${count} packaging records`);
    }
  }, { allowSignalWrites: false });

  ngOnInit(): void {
    // Initial data load
    this.loadData();
  }

  public toggleStatus(mode: 'approved' | 'pending'): void {
    this.selectedStatus.set(mode);
  }

  protected onSubmit(): void {
    this.loadData();
  }

  protected resetFilters(): void {
    this.filterForm.reset({ date: '', plant: '', product: '', packageType: '', campaign: '' });
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
      packageType: this.quickAddControls.packageType.value,
      incomingAmountKg: this.quickAddControls.incomingAmountKg.value,
      outgoingAmountKg: this.quickAddControls.outgoingAmountKg.value
    };

    let payload: PackagingRequest;
    try {
      payload = this.buildPackagingPayloadFromQuickAdd(formData);
    } catch (err) {
      console.error('Unable to prepare quick add payload', err);
      this.quickSaveError.set('Unable to prepare data.');
      return;
    }

    this.isQuickSaving.set(true);
    this.quickSaveError.set(null);

    this.apiService
      .addPackagingEntry(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newRecord: PackagingResponse) => {
          // Reload data to ensure UI shows correct filtered dataset
          this.loadData();
          this.resetQuickAddForm();
          this.isQuickSaving.set(false);
        },
        error: (err: any) => {
          console.error('Failed to add packaging record', err);
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

  protected openEditModal(row: PackagingResponse): void {
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
      packageType: row.packageType ?? '',
      incomingAmountKg: this.coerceNumber(row.incomingAmountKg),
      outgoingAmountKg: this.coerceNumber(row.outgoingAmountKg)
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
      console.warn('Attempted to save packaging record without an identifier.');
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

    let payload: PackagingRequest;
    try {
      payload = this.buildPackagingPayload();
    } catch (err) {
      this.mutationError.set('Unable to prepare packaging payload.');
      return;
    }

    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .updatePackaging(current._id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          // Reload data to ensure UI shows correct filtered dataset
          this.loadData();
          this.isMutating.set(false);
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Failed to update packaging record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to update packaging record.');
        }
      });
  }

  protected deleteCurrentRow(): void {
    const current = this.editingRow();

    if (!current?._id) {
      console.warn('Attempted to delete packaging record without an identifier.');
      return;
    }

    if (!this.canDeleteRow(current)) {
      this.mutationError.set('You are not allowed to delete this record.');
      return;
    }

    this.isMutating.set(true);
    this.mutationError.set(null);

    this.apiService
      .deletePackaging(current._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.rows.update((rows) => rows.filter((item) => item._id !== current._id));
          this.isMutating.set(false);
          this.closeEditModal();
        },
        error: (err) => {
          console.error('Failed to delete packaging record', err);
          this.isMutating.set(false);
          this.mutationError.set('Failed to delete packaging record.');
        }
      });
  }

  protected approveRecord(row: PackagingResponse): void {
    if (!row._id) {
      console.warn('Attempted to approve packaging record without an identifier.');
      return;
    }

    if (!this.canApproveRow(row)) {
      return;
    }

    this.apiService
      .approvePackaging(row._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.rows.update((rows) =>
            rows.map((item) => (item._id === updated._id ? { ...item, ...updated } : item))
          );
        },
        error: (err) => {
          console.error('Failed to approve packaging record', err);
        }
      });
  }

  private buildPackagingPayload(): PackagingRequest {
    const raw = this.editForm.getRawValue();
    const normalizedDate = this.normalizeDateValue(raw.date);

    if (!normalizedDate) {
      throw new Error('Invalid date provided');
    }

    const parsedDate = new Date(normalizedDate);

    return {
      date: parsedDate.toISOString(),
      plant: raw.plant ?? '',
      product: raw.product ?? '',
      campaign: raw.campaign ?? '',
      packageType: raw.packageType ?? '',
      incomingAmountKg: Number(raw.incomingAmountKg),
      outgoingAmountKg: Number(raw.outgoingAmountKg)
    };
  }

  private buildPackagingPayloadFromQuickAdd(formData: any): PackagingRequest {
    const parsedDate = new Date(formData.date);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date provided');
    }

    return {
      date: parsedDate.toISOString(),
      plant: formData.plant ?? '',
      product: formData.product ?? '',
      campaign: formData.campaign ?? '',
      packageType: formData.packageType ?? '',
      incomingAmountKg: Number(formData.incomingAmountKg),
      outgoingAmountKg: Number(formData.outgoingAmountKg)
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

  private buildFilters(): PackagingFilters {
    const raw = this.filterForm.getRawValue();
    const filters: PackagingFilters = {};

    Object.entries(raw).forEach(([key, value]) => {
      if (value) {
        filters[key as keyof PackagingFilters] = value;
      }
    });

    return filters;
  }

  private loadData(): void {
    this.isLoading.set(true);
    const filters = this.buildFilters();

    this.apiService
      .getFilteredPackaging(filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.rows.set(Array.isArray(data) ? data : []);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load packaging data', err);
          this.rows.set([]);
          this.isLoading.set(false);
        }
      });
  }
}














