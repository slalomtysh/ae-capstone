import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="topbar">
      <div class="brand">Scoreboard HQ</div>
      <nav>
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
          >Home</a
        >
        <a routerLink="/teams" routerLinkActive="active">Team Selection</a>
      </nav>
    </header>
    <router-outlet />
  `,
  styles: [
    `
      .topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.9rem 1.2rem;
        background: linear-gradient(90deg, #1f4f24, #337d3a);
        color: #fff;
      }

      .brand {
        font-weight: 800;
        letter-spacing: 0.4px;
      }

      nav {
        display: flex;
        gap: 1rem;
      }

      nav a {
        color: #e8ffe8;
        text-decoration: none;
        font-weight: 600;
      }

      nav a.active {
        text-decoration: underline;
      }
    `,
  ],
})
export class App {}
