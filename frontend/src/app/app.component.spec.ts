import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';
import { ThemeService } from './core/services/theme.service';
import { BackendWakeupService } from './core/services/backend-wakeup.service';
import { BehaviorSubject, of } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('AppComponent - Mobile Unread Badge & Auth Integration', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let currentUserSubject: BehaviorSubject<any>;
  let unreadCountSubject: BehaviorSubject<number>;
  let fetchUnreadCountSpy: jasmine.Spy;
  let startPollingSpy: jasmine.Spy;
  let stopPollingSpy: jasmine.Spy;

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<any>({
      _id: 'user_1',
      username: 'johndoe',
      isOnboarded: true
    });
    unreadCountSubject = new BehaviorSubject<number>(0);
    fetchUnreadCountSpy = jasmine.createSpy('fetchUnreadCount');
    startPollingSpy = jasmine.createSpy('startPolling');
    stopPollingSpy = jasmine.createSpy('stopPolling');

    const authServiceMock = {
      currentUser$: currentUserSubject.asObservable(),
      get currentUserValue() { return currentUserSubject.value; },
      logout: jasmine.createSpy('logout')
    };

    const notificationServiceMock = {
      unreadCount$: unreadCountSubject.asObservable(),
      get unreadCount() { return unreadCountSubject.value; },
      fetchUnreadCount: fetchUnreadCountSpy,
      startPolling: startPollingSpy,
      stopPolling: stopPollingSpy,
      setUnreadCount: (c: number) => unreadCountSubject.next(c)
    };

    const themeServiceMock = {
      isDarkMode$: of(true),
      toggleTheme: jasmine.createSpy('toggleTheme')
    };

    const wakeupServiceMock = {
      isReady$: of(true),
      hasFailed$: of(false),
      statusMessage$: of('Connected'),
      retryPing: jasmine.createSpy('retryPing')
    };

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: ThemeService, useValue: themeServiceMock },
        { provide: BackendWakeupService, useValue: wakeupServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('Case A: should not render mobile badge when unreadCount is 0', () => {
    unreadCountSubject.next(0);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.mobile-nav-item .nav-unread-badge'));
    expect(badge).toBeNull();
  });

  it('Case B: should render "1" on mobile badge when unreadCount is 1', () => {
    unreadCountSubject.next(1);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.mobile-nav-item .nav-unread-badge'));
    expect(badge).not.toBeNull();
    expect(badge.nativeElement.textContent.trim()).toBe('1');
  });

  it('Case C: should render "7" on mobile badge when unreadCount is 7', () => {
    unreadCountSubject.next(7);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.mobile-nav-item .nav-unread-badge'));
    expect(badge).not.toBeNull();
    expect(badge.nativeElement.textContent.trim()).toBe('7');
  });

  it('Case D: should render "99+" on mobile badge when unreadCount is 100', () => {
    unreadCountSubject.next(100);
    fixture.detectChanges();

    const badge = fixture.debugElement.query(By.css('.mobile-nav-item .nav-unread-badge'));
    expect(badge).not.toBeNull();
    expect(badge.nativeElement.textContent.trim()).toBe('99+');
  });

  it('Case F: should remove mobile badge when unreadCount changes from 5 to 0', () => {
    unreadCountSubject.next(5);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.mobile-nav-item .nav-unread-badge'))).not.toBeNull();

    unreadCountSubject.next(0);
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('.mobile-nav-item .nav-unread-badge'))).toBeNull();
  });

  it('Case H: should stop polling and reset count on logout, and fetch on login', () => {
    expect(fetchUnreadCountSpy).toHaveBeenCalled();
    expect(startPollingSpy).toHaveBeenCalled();

    // User logs out
    currentUserSubject.next(null);
    fixture.detectChanges();

    expect(stopPollingSpy).toHaveBeenCalled();
    expect(component.unreadCount).toBe(0);

    // Another user logs in
    currentUserSubject.next({ _id: 'user_2', username: 'janedoe', isOnboarded: true });
    fixture.detectChanges();

    expect(fetchUnreadCountSpy.calls.count()).toBeGreaterThan(1);
  });
});
