import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { map, catchError, startWith, switchMap } from 'rxjs/operators';

export interface SystemStatus {
  backend: boolean;
  database: boolean;
  lastChecked: Date;
  message: string;
  responseTime?: number;
  uptime?: number;
  connections?: {
    database: string;
  };
  databaseError?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HealthService {
  private readonly apiUrl = 'http://localhost:5000/api';
  private statusSubject = new BehaviorSubject<SystemStatus>({
    backend: false,
    database: false,
    lastChecked: new Date(),
    message: 'Connecting...'
  });

  public status$ = this.statusSubject.asObservable();

  constructor(private http: HttpClient) {
    this.startHealthMonitoring();
  }

  private startHealthMonitoring(): void {
    console.log('Starting health monitoring...');
    // Check health immediately, then every 30 seconds
    timer(0, 30000).pipe(
      switchMap(() => this.checkBackendHealth())
    ).subscribe(status => {
      console.log('Status update:', status);
      this.statusSubject.next(status);
    });
  }

  private checkBackendHealth(): Observable<SystemStatus> {
    return this.http.get(`${this.apiUrl}/health`).pipe(
      map((response: any) => {
        console.log('Health check response:', response);
        return {
          backend: true,
          database: response.database || false,
          lastChecked: new Date(),
          message: 'All Systems Online'
        };
      }),
      catchError((error) => {
        console.warn('Backend health check failed:', error);
        return [{
          backend: false,
          database: false,
          lastChecked: new Date(),
          message: 'Backend Offline'
        }];
      }),
      startWith({
        backend: false,
        database: false,
        lastChecked: new Date(),
        message: 'Checking...'
      })
    );
  }

  // Manual health check
  public checkHealth(): Observable<SystemStatus> {
    return this.checkBackendHealth();
  }

  // Get current status synchronously
  public getCurrentStatus(): SystemStatus {
    return this.statusSubject.value;
  }
}