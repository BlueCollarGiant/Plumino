import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type PackagingAggregateId =
  | string
  | {
      campaign?: string;
      date?: string;
    };

export interface PackagingAggregate {
  _id: PackagingAggregateId;
  outgoingTotal: number;
  incomingTotal: number;
}

export interface PackagingFilters {
  [key: string]: unknown;
  date?: string;
  plant?: string;
  product?: string;
  packageType?: string;
  campaign?: string;
  range?: string;
}

export interface DataFilters {
  [key: string]: unknown;
  date?: string;
  plant?: string;
  product?: string;
  campaign?: string;
  stage?: string;
}

export interface FermentationResponse {
  _id?: string;
  date?: string | Date;
  plant?: string;
  product?: string;
  campaign?: string;
  stage?: string;
  tank?: string;
  levelIndicator?: string;
  weight?: number;
  weightLbs?: number;
  receivedAmount?: number;
  receivedAmountLbs?: number;
}

export interface ExtractionResponse {
  _id?: string;
  date?: string | Date;
  plant?: string;
  product?: string;
  campaign?: string;
  stage?: string;
  tank?: string;
  concentration?: number;
  volume?: number;
  weight?: number;
  levelIndicator?: string;
  pH?: number;
}
export interface ExtractionRequest {
  date: string | Date;
  plant: string;
  product: string;
  campaign: string;
  stage: string;
  tank: string;
  concentration: number;
  volume: number;
  weight: number;
  levelIndicator: string;
  pH: number;
}


export interface PackagingResponse {
  _id: string;
  date: string;
  plant: string;
  product: string;
  campaign: string;
  packageType: string;
  incomingAmountKg: number;
  outgoingAmountKg: number;
}

export interface PackagingRequest {
  date: string | Date;
  plant: string;
  product: string;
  campaign: string;
  packageType: string;
  incomingAmountKg: number;
  outgoingAmountKg: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5000/api';

  private buildParams(filters: Record<string, unknown> = {}): HttpParams {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return params;
  }

  // Fetch packaging records with optional filters converted into query parameters
  getFilteredPackaging(filters: PackagingFilters = {}): Observable<PackagingResponse[]> {
    return this.http.get<PackagingResponse[]>(`${this.baseUrl}/packaging/filter`, {
      params: this.buildParams(filters)
    });
  }

  updatePackaging(id: string, payload: PackagingRequest): Observable<PackagingResponse> {
    return this.http.put<PackagingResponse>(`${this.baseUrl}/packaging/${id}`, payload);
  }

  deletePackaging(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/packaging/${id}`);
  }

  // Aggregated totals grouped by plant
  getPackagingStatsByPlant(filters: PackagingFilters = {}): Observable<PackagingAggregate[]> {
    return this.http.get<PackagingAggregate[]>(`${this.baseUrl}/packaging/stats/by-plant`, {
      params: this.buildParams(filters)
    });
  }

  // Aggregated totals grouped by product
  getPackagingStatsByProduct(filters: PackagingFilters = {}): Observable<PackagingAggregate[]> {
    return this.http.get<PackagingAggregate[]>(`${this.baseUrl}/packaging/stats/by-product`, {
      params: this.buildParams(filters)
    });
  }

  // Aggregated totals grouped by campaign
  getPackagingStatsByCampaign(filters: PackagingFilters = {}): Observable<PackagingAggregate[]> {
    return this.http.get<PackagingAggregate[]>(`${this.baseUrl}/packaging/stats/by-campaign`, {
      params: this.buildParams(filters)
    });
  }

  // Aggregated totals grouped by date
  getPackagingStatsByDate(filters: PackagingFilters = {}): Observable<PackagingAggregate[]> {
    return this.http.get<PackagingAggregate[]>(`${this.baseUrl}/packaging/stats/by-date`, {
      params: this.buildParams(filters)
    });
  }

  getFermentationData(filters: DataFilters = {}): Observable<FermentationResponse[]> {
    return this.http.get<FermentationResponse[]>(`${this.baseUrl}/fermentation/filter`, {
      params: this.buildParams(filters)
    });
  }

  getExtractionData(filters: DataFilters = {}): Observable<ExtractionResponse[]> {
    return this.http.get<ExtractionResponse[]>(`${this.baseUrl}/extraction/filter`, {
      params: this.buildParams(filters)
    });
  }

  updateExtraction(id: string, payload: ExtractionRequest): Observable<ExtractionResponse> {
    return this.http.put<ExtractionResponse>(`${this.baseUrl}/extraction/${id}`, payload);
  }

  deleteExtraction(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/extraction/${id}`);
  }
}

