import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { provideRouter } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { NotificationService } from '../../../core/services/notification.service';
import { By } from '@angular/platform-browser';

describe('SidebarComponent - Unread Notification Badge', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let unreadCountSubject: BehaviorSubject<number>;
  let currentUserSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    unreadCountSubject = new BehaviorSubject<number>(0);
    currentUserSubject = new BehaviorSubject<any>({
      _id: 'user_1',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user'
    });

    const authServiceMock = {
      currentUser$: currentUserSubject.asObservable(),
      currentUserValue: currentUserSubject.value,
      logout: jasmine.createSpy('logout')
    };

    const themeServiceMock = {
      isDarkMode$: of(true),
      toggleTheme: jasmine.createSpy('toggleTheme')
    };

    const notificationServiceMock = {
      unreadCount$: unreadCountSubject.asObservable(),
      get unreadCount() { return unreadCountSubject.value; },
      fetchUnreadCount: jasmine.createSpy('fetchUnreadCount'),
      startPolling: jasmine.createSpy('startPolling'),
      stopPolling: jasmine.createSpy('stopPolling'),
      setUnreadCount: (c: number) => unreadCountSubject.next(c)
    };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('Case A: should NOT display badge when unreadCount is 0', () => {
    unreadCountSubject.next(0);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.sidebar-unread-badge'));
    expect(badge).toBeNull();
  });

  it('Case B: should display "1" when unreadCount is 1', () => {
    unreadCountSubject.next(1);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.sidebar-unread-badge'));
    expect(badge).not.toBeNull();
    expect(badge.nativeElement.textContent.trim()).toBe('1');
  });

  it('Case C: should display "7" when unreadCount is 7', () => {
    unreadCountSubject.next(7);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.sidebar-unread-badge'));
    expect(badge).not.toBeNull();
    expect(badge.nativeElement.textContent.trim()).toBe('7');
  });

  it('Case D: should display "99+" when unreadCount is 100', () => {
    unreadCountSubject.next(100);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.sidebar-unread-badge'));
    expect(badge).not.toBeNull();
    expect(badge.nativeElement.textContent.trim()).toBe('99+');
  });

  it('Case E: should update badge when unread count decreases', () => {
    unreadCountSubject.next(7);
    fixture.detectChanges();

    let badge = fixture.debugElement.query(By.css('.sidebar-unread-badge'));
    expect(badge.nativeElement.textContent.trim()).toBe('7');

    unreadCountSubject.next(6);
    fixture.detectChanges();

    badge = fixture.debugElement.query(By.css('.sidebar-unread-badge'));
    expect(badge.nativeElement.textContent.trim()).toBe('6');
  });

  it('Case F: should remove badge when unread count reaches 0', () => {
    unreadCountSubject.next(5);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.sidebar-unread-badge'))).not.toBeNull();

    unreadCountSubject.next(0);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.sidebar-unread-badge'))).toBeNull();
  });

  it('should display badge even when sidebar is collapsed', () => {
    component.isCollapsed = true;
    unreadCountSubject.next(3);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.sidebar-unread-badge'));
    expect(badge).not.toBeNull();
    expect(badge.nativeElement.textContent.trim()).toBe('3');
  });
});
