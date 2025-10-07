import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="admin-dashboard">
      <header class="admin-header">
        <h1>Admin Dashboard</h1>
      </header>
    </section>
  `
})
export class AdminComponent {}
