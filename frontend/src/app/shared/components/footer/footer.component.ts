import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="app-footer" role="contentinfo">
      <div class="footer-sheen" aria-hidden="true"></div>
      <div class="footer-content">
        <p class="footer-text">
          © {{ currentYear }} Plumino System — Created by BlueCollarGiant and Shaylee Farris
        </p>
      </div>
    </footer>
  `,
  styles: [`
    .app-footer {
      position: relative;
      width: 100%;
      margin-top: auto;
      background: linear-gradient(180deg, rgba(10, 15, 28, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      box-shadow: 0 -12px 40px rgba(15, 23, 42, 0.45);
      color: #cbd5e1;
      overflow: hidden;
      isolation: isolate;
    }

    .footer-content {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem 1.5rem;
      text-align: center;
      backdrop-filter: blur(6px);
    }

    .footer-text {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      color: rgba(226, 232, 240, 0.86);
      text-shadow: 0 0 18px rgba(34, 197, 94, 0.25);
    }

    .footer-sheen {
      position: absolute;
      inset: 0 -40%;
      background:
        radial-gradient(40% 80% at 20% 50%, rgba(59, 130, 246, 0.22), transparent),
        radial-gradient(45% 95% at 80% 50%, rgba(34, 197, 94, 0.25), transparent);
      opacity: 0.75;
      transform: translateX(-10%);
      animation: footerSheen 14s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes footerSheen {
      0% {
        transform: translateX(-20%) scale(1);
        opacity: 0.35;
      }
      25% {
        opacity: 0.65;
      }
      50% {
        transform: translateX(10%) scale(1.05);
        opacity: 0.45;
      }
      100% {
        transform: translateX(25%) scale(1.05);
        opacity: 0.25;
      }
    }

    @media (max-width: 768px) {
      .footer-content {
        padding: 1.25rem 1rem;
      }

      .footer-text {
        font-size: 0.85rem;
        line-height: 1.5;
      }
    }
  `]
})
export class FooterComponent {
  readonly currentYear = new Date().getFullYear();
}
