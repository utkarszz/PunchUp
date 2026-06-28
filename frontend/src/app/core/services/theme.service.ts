import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkModeSubject = new BehaviorSubject<boolean>(true);
  public isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor() {
    this.initTheme();
  }

  private initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Default to dark mode unless explicitly saved as light
    const isDark = savedTheme ? savedTheme === 'dark' : true;
    this.setTheme(isDark);
  }

  public toggleTheme() {
    this.setTheme(!this.isDarkModeSubject.value);
  }

  public setTheme(isDark: boolean) {
    this.isDarkModeSubject.next(isDark);
    if (isDark) {
      document.documentElement.classList.remove('light-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.add('light-mode');
      localStorage.setItem('theme', 'light');
    }
  }
}
