import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: number;
  type: 'success' | 'info' | 'error';
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  public toasts$ = this.toastsSubject.asObservable();
  private toastIdCounter = 0;

  public show(type: 'success' | 'info' | 'error', message: string, duration: number = 4000) {
    const id = ++this.toastIdCounter;
    const toast: ToastMessage = { id, type, message, duration };
    
    // Add to list
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  public showSuccess(message: string, duration?: number) {
    this.show('success', message, duration);
  }

  public showError(message: string, duration?: number) {
    this.show('error', message, duration);
  }

  public showInfo(message: string, duration?: number) {
    this.show('info', message, duration);
  }

  public remove(id: number) {
    const filtered = this.toastsSubject.value.filter(t => t.id !== id);
    this.toastsSubject.next(filtered);
  }
}
