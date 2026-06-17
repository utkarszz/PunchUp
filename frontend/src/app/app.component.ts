import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { AuthService } from './core/services/auth.service';
import { BackendWakeupService } from './core/services/backend-wakeup.service';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterLink, RouterLinkActive, SidebarComponent, CommandPaletteComponent, ToastComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  public wakeupService = inject(BackendWakeupService);
  public isAuthenticated = false;

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
    });
  }
}
