import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { toObservable } from '@angular/core/rxjs-interop';

export interface PackagingFilters {
  [key: string]: unknown;
  readonly date?: string;
  readonly plant?: string;
  readonly product?: string;
  readonly packageType?: string;
  readonly campaign?: string;
  readonly range?: string;
}

export interface DataFilters {
  [key: string]: unknown;
  readonly date?: string;
  readonly plant?: string;
  readonly product?: string;
  readonly campaign?: string;
  readonly stage?: string;
}

export interface FermentationResponse {
  readonly _id?: string;
  readonly date?: string | Date;
  readonly plant?: string;
  readonly product?: string;
  readonly campaign?: string;
  readonly stage?: string;
  readonly tank?: string;
  readonly levelIndicator?: string;
  readonly weight?: number;
  readonly weightLbs?: number;
  readonly receivedAmount?: number;
  readonly receivedAmountLbs?: number;
}

export interface FermentationRequest {
  readonly date: string | Date;
  readonly plant: string;
  readonly product: string;
  readonly campaign: string;
  readonly stage: string;
  readonly tank: string;
  readonly levelIndicator: string;
  readonly weight: number;
  readonly receivedAmount: number;
}

export interface ExtractionResponse {
  readonly _id?: string;
  readonly date?: string | Date;
  readonly plant?: string;
  readonly product?: string;
  readonly campaign?: string;
  readonly stage?: string;
  readonly tank?: string;
  readonly concentration?: number;
  readonly volume?: number;
  readonly weight?: number;
  readonly levelIndicator?: string;
  readonly pH?: number;
}

export interface ExtractionRequest {
  readonly date: string | Date;
  readonly plant: string;
  readonly product: string;
  readonly campaign: string;
  readonly stage: string;
  readonly tank: string;
  readonly concentration: number;
  readonly volume: number;
  readonly weight: number;
  readonly levelIndicator: string;
  readonly pH: number;
}

export interface PackagingResponse {
  readonly _id: string;
  readonly date: string;
  readonly plant: string;
  readonly product: string;
  readonly campaign: string;
  readonly packageType: string;
  readonly incomingAmountKg: number;
  readonly outgoingAmountKg: number;
}

export interface PackagingRequest {
  readonly date: string | Date;
  readonly plant: string;
  readonly product: string;
  readonly campaign: string;
  readonly packageType: string;
  readonly incomingAmountKg: number;
  readonly outgoingAmountKg: number;
}

@Injectable({ providedIn: 'root' })
// Exported: used in all three dashboard components
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = signal('http://localhost:5000/api');

  // Signal-based caching for performance optimization
  private readonly packagingCache = signal<Map<string, PackagingResponse[]>>(new Map());
  private readonly fermentationCache = signal<Map<string, FermentationResponse[]>>(new Map());
  private readonly extractionCache = signal<Map<string, ExtractionResponse[]>>(new Map());

  // Computed signals for cache status
  readonly packagingCacheSize = computed(() => this.packagingCache().size);
  readonly fermentationCacheSize = computed(() => this.fermentationCache().size);
  readonly extractionCacheSize = computed(() => this.extractionCache().size);
  readonly totalCacheSize = computed(() =>
    this.packagingCacheSize() + this.fermentationCacheSize() + this.extractionCacheSize()
  );

  // Observable from baseUrl signal for reactive URL changes
  readonly baseUrl$ = toObservable(this.baseUrl);

  private buildParams(filters: Record<string, unknown> = {}): HttpParams {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  private generateCacheKey(filters: Record<string, unknown>): string {
    return JSON.stringify(filters, Object.keys(filters).sort());
  }

  private invalidatePackagingCache(): void {
    this.packagingCache.set(new Map());
  }

  private invalidateFermentationCache(): void {
    this.fermentationCache.set(new Map());
  }

  private invalidateExtractionCache(): void {
    this.extractionCache.set(new Map());
  }

  // Clear all caches - useful for memory management
  clearAllCaches(): void {
    this.invalidatePackagingCache();
    this.invalidateFermentationCache();
    this.invalidateExtractionCache();
  }

  // Update base URL if needed (e.g., for different environments)
  updateBaseUrl(newUrl: string): void {
    this.baseUrl.set(newUrl);
    this.clearAllCaches(); // Clear caches when URL changes
  }

  // Fetch packaging records with optional filters converted into query parameters
  getFilteredPackaging(filters: PackagingFilters = {}): Observable<PackagingResponse[]> {
    const cacheKey = this.generateCacheKey(filters);
    const cached = this.packagingCache().get(cacheKey);

    if (cached) {
      // Return cached data as observable
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    const request = this.http.get<PackagingResponse[]>(`${this.baseUrl()}/packaging/filter`, {
      params: this.buildParams(filters)
    }).pipe(
      shareReplay(1)
    );

    // Cache the result
    request.subscribe(data => {
      const currentCache = this.packagingCache();
      currentCache.set(cacheKey, data);
      this.packagingCache.set(new Map(currentCache));
    });

    return request;
  }

  updatePackaging(id: string, payload: PackagingRequest): Observable<PackagingResponse> {
    const request = this.http.put<PackagingResponse>(`${this.baseUrl()}/packaging/${id}`, payload);

    // Invalidate cache on mutation
    request.subscribe(() => this.invalidatePackagingCache());

    return request;
  }

  deletePackaging(id: string): Observable<void> {
    const request = this.http.delete<void>(`${this.baseUrl()}/packaging/${id}`);

    // Invalidate cache on mutation
    request.subscribe(() => this.invalidatePackagingCache());

    return request;
  }

  getFermentationData(filters: DataFilters = {}): Observable<FermentationResponse[]> {
    const cacheKey = this.generateCacheKey(filters);
    const cached = this.fermentationCache().get(cacheKey);

    if (cached) {
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    const request = this.http.get<FermentationResponse[]>(`${this.baseUrl()}/fermentation/filter`, {
      params: this.buildParams(filters)
    }).pipe(
      shareReplay(1)
    );

    request.subscribe(data => {
      const currentCache = this.fermentationCache();
      currentCache.set(cacheKey, data);
      this.fermentationCache.set(new Map(currentCache));
    });

    return request;
  }

  updateFermentation(id: string, payload: FermentationRequest): Observable<FermentationResponse> {
    const request = this.http.put<FermentationResponse>(`${this.baseUrl()}/fermentation/${id}`, payload);

    request.subscribe(() => this.invalidateFermentationCache());

    return request;
  }

  deleteFermentation(id: string): Observable<void> {
    const request = this.http.delete<void>(`${this.baseUrl()}/fermentation/${id}`);

    request.subscribe(() => this.invalidateFermentationCache());

    return request;
  }

  getExtractionData(filters: DataFilters = {}): Observable<ExtractionResponse[]> {
    const cacheKey = this.generateCacheKey(filters);
    const cached = this.extractionCache().get(cacheKey);

    if (cached) {
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    const request = this.http.get<ExtractionResponse[]>(`${this.baseUrl()}/extraction/filter`, {
      params: this.buildParams(filters)
    }).pipe(
      shareReplay(1)
    );

    request.subscribe(data => {
      const currentCache = this.extractionCache();
      currentCache.set(cacheKey, data);
      this.extractionCache.set(new Map(currentCache));
    });

    return request;
  }

  updateExtraction(id: string, payload: ExtractionRequest): Observable<ExtractionResponse> {
    const request = this.http.put<ExtractionResponse>(`${this.baseUrl()}/extraction/${id}`, payload);

    request.subscribe(() => this.invalidateExtractionCache());

    return request;
  }

  deleteExtraction(id: string): Observable<void> {
    const request = this.http.delete<void>(`${this.baseUrl()}/extraction/${id}`);

    request.subscribe(() => this.invalidateExtractionCache());

    return request;
  }
}



