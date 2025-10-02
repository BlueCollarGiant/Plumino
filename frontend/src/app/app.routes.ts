
import { Routes } from '@angular/router';


export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'packaging',
    loadComponent: () => import('./features/packaging/packaging-dashboard.component').then(m => m.PackagingDashboardComponent)
  },
  {
    path: 'fermentation',
    loadComponent: () => import('./features/fermentation/fermentation-dashboard.component').then(m => m.FermentationDashboardComponent)
  },
  {
    path: 'extraction',
    loadComponent: () => import('./features/extraction/extraction-dashboard.component').then(m => m.ExtractionDashboardComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

