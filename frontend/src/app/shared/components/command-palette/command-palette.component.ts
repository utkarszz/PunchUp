import { Component, HostListener, OnInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface CommandItem {
  title: string;
  subtitle: string;
  category: 'Navigation' | 'Actions';
  action: () => void;
  iconSvg: string;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="palette-backdrop" *ngIf="isOpen" (click)="closePalette($event)">
      <div class="palette-modal" (click)="$event.stopPropagation()">
        <div class="palette-search-container">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            #searchInput
            type="text" 
            placeholder="Type a command or search..." 
            (input)="onSearch($event)"
            (keydown)="onKeyDown($event)"
            class="palette-input" />
          <kbd class="esc-kbd">ESC</kbd>
        </div>

        <div class="palette-results" *ngIf="filteredItems.length > 0; else noResults">
          <div class="category-group" *ngFor="let cat of getCategories()">
            <div class="category-header">{{ cat }}</div>
            <div 
              *ngFor="let item of getItemsByCategory(cat); let i = index"
              [class.active]="item === selectedItem"
              (click)="executeCommand(item)"
              (mouseenter)="selectItem(item)"
              class="result-item">
              <span class="item-icon" [innerHTML]="item.iconSvg"></span>
              <div class="item-details">
                <span class="item-title">{{ item.title }}</span>
                <span class="item-subtitle">{{ item.subtitle }}</span>
              </div>
              <span class="item-badge" *ngIf="item.category === 'Actions'">Action</span>
              <kbd class="enter-kbd" *ngIf="item === selectedItem">↵ Enter</kbd>
            </div>
          </div>
        </div>

        <ng-template #noResults>
          <div class="no-results-state">
            <span>No results found for your search query.</span>
          </div>
        </ng-template>

        <div class="palette-footer">
          <div class="footer-hint">
            <kbd>↑↓</kbd> to navigate
            <kbd>↵</kbd> to select
          </div>
          <div class="footer-shortcut">
            Press <kbd>Ctrl + K</kbd> to open
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .palette-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(9, 9, 11, 0.75);
      backdrop-filter: blur(8px);
      z-index: 2000;
      display: flex;
      justify-content: center;
      padding-top: 10vh;
      animation: fadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .palette-modal {
      background: var(--surface);
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 600px;
      max-height: 450px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes scaleUp {
      from {
        opacity: 0;
        transform: scale(0.96) translateY(-8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .palette-search-container {
      display: flex;
      align-items: center;
      padding: 1.125rem 1.25rem;
      border-bottom: 1px solid var(--border);
      gap: 0.75rem;
    }

    .search-icon {
      color: var(--text-muted);
    }

    .palette-input {
      flex: 1;
      background: transparent;
      border: none;
      box-shadow: none;
      padding: 0;
      font-size: 1rem;
      color: var(--text-primary);
    }

    .palette-input:focus {
      box-shadow: none;
      border: none;
    }

    .esc-kbd, .enter-kbd, .footer-hint kbd, .footer-shortcut kbd {
      background: var(--surface-hover);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      border-radius: 4px;
      padding: 0.125rem 0.375rem;
      font-size: 0.6875rem;
      font-family: monospace;
      font-weight: 500;
      box-shadow: 0 1px 0 rgba(0,0,0,0.4);
    }

    .palette-results {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }

    .category-group {
      margin-bottom: 0.75rem;
    }

    .category-header {
      font-size: 0.6875rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.5rem 0.75rem;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius);
      cursor: pointer;
      color: var(--text-secondary);
      transition: all var(--transition-fast) ease;
    }

    .result-item:hover, .result-item.active {
      color: var(--text-primary);
      background-color: var(--surface-hover);
    }

    .result-item.active {
      border: 1px solid var(--border-hover);
    }

    .item-icon {
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .result-item.active .item-icon {
      color: var(--text-primary);
    }

    .item-details {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .item-title {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .item-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .item-badge {
      font-size: 0.6875rem;
      color: var(--text-secondary);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 0.125rem 0.25rem;
    }

    .no-results-state {
      padding: 2.5rem 1rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
    }

    .palette-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.25rem;
      border-top: 1px solid var(--border);
      background: rgba(9, 9, 11, 0.2);
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .footer-hint {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  `]
})
export class CommandPaletteComponent implements OnInit {
  private router = inject(Router);
  
  public isOpen = false;
  public searchVal = '';
  public commands: CommandItem[] = [];
  public filteredItems: CommandItem[] = [];
  public selectedItem: CommandItem | null = null;

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  ngOnInit() {
    this.initCommands();
    this.filteredItems = [...this.commands];
  }

  private initCommands() {
    this.commands = [
      {
        title: 'Go to Dashboard',
        subtitle: 'View streaks, task completion rates and grid previews',
        category: 'Navigation',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>`,
        action: () => this.navigateTo('/dashboard')
      },
      {
        title: 'Go to Tasks',
        subtitle: 'Manage, check off, and organize your daily work',
        category: 'Navigation',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
        action: () => this.navigateTo('/tasks')
      },
      {
        title: 'Go to Analytics',
        subtitle: 'Review task statistics and completion rate graphs',
        category: 'Navigation',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`,
        action: () => this.navigateTo('/analytics')
      },
      {
        title: 'Go to Consistency Grid',
        subtitle: 'Check your contribution grid and heat map',
        category: 'Navigation',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`,
        action: () => this.navigateTo('/grid')
      },
      {
        title: 'Go to Profile Settings',
        subtitle: 'Edit user biography, username, and upload avatar pictures',
        category: 'Navigation',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
        action: () => this.navigateTo('/profile')
      },
      {
        title: 'Go to Community Roadmap',
        subtitle: 'Discover upcoming features launching in Version 2',
        category: 'Navigation',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>`,
        action: () => this.navigateTo('/community')
      },
      {
        title: 'Create New Task',
        subtitle: 'Instantly add a new entry to your active task list',
        category: 'Actions',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
        action: () => {
          this.isOpen = false;
          this.router.navigate(['/tasks'], { queryParams: { create: 'true' } });
        }
      }
    ];
  }

  @HostListener('window:keydown', ['$event'])
  handleGlobalShortcut(event: KeyboardEvent) {
    // Check for Ctrl+K or Cmd+K
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.togglePalette();
    }
  }

  private togglePalette() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.searchVal = '';
      this.filteredItems = [...this.commands];
      if (this.filteredItems.length > 0) {
        this.selectedItem = this.filteredItems[0];
      }
      setTimeout(() => {
        this.searchInput?.nativeElement?.focus();
      }, 50);
    }
  }

  public closePalette(event?: MouseEvent) {
    this.isOpen = false;
  }

  private navigateTo(route: string) {
    this.isOpen = false;
    this.router.navigate([route]);
  }

  public onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchVal = input.value.toLowerCase().trim();

    if (!this.searchVal) {
      this.filteredItems = [...this.commands];
    } else {
      this.filteredItems = this.commands.filter(item => 
        item.title.toLowerCase().includes(this.searchVal) ||
        item.subtitle.toLowerCase().includes(this.searchVal)
      );
    }

    if (this.filteredItems.length > 0) {
      this.selectedItem = this.filteredItems[0];
    } else {
      this.selectedItem = null;
    }
  }

  public onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closePalette();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveSelection(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveSelection(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (this.selectedItem) {
        this.executeCommand(this.selectedItem);
      }
    }
  }

  private moveSelection(direction: number) {
    if (this.filteredItems.length === 0) return;
    
    const currentIndex = this.filteredItems.indexOf(this.selectedItem as CommandItem);
    let nextIndex = currentIndex + direction;

    if (nextIndex < 0) {
      nextIndex = this.filteredItems.length - 1;
    } else if (nextIndex >= this.filteredItems.length) {
      nextIndex = 0;
    }

    this.selectedItem = this.filteredItems[nextIndex];
    
    // Auto-scroll inside list container
    const activeEl = document.querySelector('.result-item.active');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  public selectItem(item: CommandItem) {
    this.selectedItem = item;
  }

  public executeCommand(item: CommandItem) {
    item.action();
  }

  public getCategories(): ('Navigation' | 'Actions')[] {
    const categoriesSet = new Set(this.filteredItems.map(i => i.category));
    return Array.from(categoriesSet);
  }

  public getItemsByCategory(category: string): CommandItem[] {
    return this.filteredItems.filter(i => i.category === category);
  }
}
