import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="home">
      <h2>Welcome to Plumino Operations</h2>
      <p>Select the area you want to explore or jump straight into analytics.</p>
      <div class="tiles">
        <a routerLink="/pov-analytics" class="tile highlight">
          <h3>POV Analytics</h3>
          <p>Compare Packaging, Fermentation, and Extraction KPIs with interactive charts.</p>
        </a>
        <a routerLink="/packaging" class="tile">
          <h3>Packaging POV</h3>
          <p>Track incoming vs. outgoing quantities by package and campaign.</p>
        </a>
        <a routerLink="/fermentation" class="tile">
          <h3>Fermentation POV</h3>
          <p>Review tank activity, levels, and weights across plants.</p>
        </a>
        <a routerLink="/extraction" class="tile">
          <h3>Extraction POV</h3>
          <p>Monitor concentration, volume, and pH trends for extraction runs.</p>
        </a>
      </div>
    </section>
  `,
  styles: [
    `
      .home {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        padding: 2rem 1rem;
        background: #f8fafc;
        border-radius: 0.75rem;
      }
      h2 {
        margin: 0;
        font-size: 1.75rem;
        color: #0f172a;
      }
      p {
        margin: 0;
        color: #475569;
      }
      .tiles {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 1rem;
      }
      .tile {
        display: block;
        padding: 1.25rem;
        background: #fff;
        border-radius: 0.75rem;
        border: 1px solid #e2e8f0;
        text-decoration: none;
        color: inherit;
        transition: border-color 0.2s ease, transform 0.2s ease;
      }
      .tile h3 {
        margin: 0 0 0.5rem;
        color: #1d4ed8;
      }
      .tile:hover {
        border-color: #38bdf8;
        transform: translateY(-2px);
      }
      .tile.highlight {
        border-color: #38bdf8;
        background: rgba(56, 189, 248, 0.1);
      }
    `
  ]
})
export class HomeComponent {}
