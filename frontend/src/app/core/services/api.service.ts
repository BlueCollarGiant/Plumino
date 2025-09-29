import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface PackagingAggregate {
  _id: string;
  total: number;
}

export interface PackagingFilters {
  date?: string;
  plant?: string;
  product?: string;
  campaign?: string;
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

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:5000/api';

  private buildParams(filters: PackagingFilters = {}): HttpParams {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params = params.set(key, value);
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
}
