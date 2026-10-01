import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { environment } from '../../../environments/environment';

describe('NotificationService - Unread Count & State Management', () => {
  let service: NotificationService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/api/notifications`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [NotificationService]
    });
    service = TestBed.inject(NotificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stopPolling();
    httpMock.verify();
  });

  it('should initialize with unreadCount = 0', () => {
    expect(service.unreadCount).toBe(0);
  });

  it('Case A: should fetch unread count 0 and emit 0', () => {
    let emittedCount = -1;
    service.unreadCount$.subscribe(c => emittedCount = c);

    service.fetchUnreadCount();

    const req = httpMock.expectOne(`${apiUrl}/unread-count`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, count: 0, unreadCount: 0 });

    expect(service.unreadCount).toBe(0);
    expect(emittedCount).toBe(0);
  });

  it('Case B: should fetch unread count 1 and update state', () => {
    service.fetchUnreadCount();

    const req = httpMock.expectOne(`${apiUrl}/unread-count`);
    req.flush({ success: true, count: 1, unreadCount: 1 });

    expect(service.unreadCount).toBe(1);
  });

  it('Case C: should fetch unread count 7 and update state', () => {
    service.fetchUnreadCount();

    const req = httpMock.expectOne(`${apiUrl}/unread-count`);
    req.flush({ success: true, count: 7, unreadCount: 7 });

    expect(service.unreadCount).toBe(7);
  });

  it('Case D: should fetch unread count 100 and update state', () => {
    service.fetchUnreadCount();

    const req = httpMock.expectOne(`${apiUrl}/unread-count`);
    req.flush({ success: true, count: 100, unreadCount: 100 });

    expect(service.unreadCount).toBe(100);
  });

  it('Case E: should decrement unread count by 1 when marking one notification as read', () => {
    service.setUnreadCount(7);
    expect(service.unreadCount).toBe(7);

    service.markRead('notif_123').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/notif_123/read`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true });

    expect(service.unreadCount).toBe(6);
  });

  it('Case F: should reset unread count to 0 when marking all notifications as read', () => {
    service.setUnreadCount(15);
    expect(service.unreadCount).toBe(15);

    service.markAllRead().subscribe();

    const req = httpMock.expectOne(`${apiUrl}/read-all`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ success: true, message: 'All notifications marked as read' });

    expect(service.unreadCount).toBe(0);
  });

  it('Case I: should increment unread count when a new notification arrives', () => {
    service.setUnreadCount(3);
    service.incrementUnreadCount();
    expect(service.unreadCount).toBe(4);
  });

  it('should not decrement below 0 when markRead is called at 0', () => {
    service.setUnreadCount(0);
    service.markRead('notif_999').subscribe();

    const req = httpMock.expectOne(`${apiUrl}/notif_999/read`);
    req.flush({ success: true });

    expect(service.unreadCount).toBe(0);
  });
});
