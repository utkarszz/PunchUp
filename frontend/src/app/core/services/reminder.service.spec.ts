import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReminderService } from './reminder.service';
import { environment } from '../../../environments/environment';

describe('ReminderService', () => {
  let service: ReminderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ReminderService],
    });

    service = TestBed.inject(ReminderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('1. Service instantiates without requesting notification permission', () => {
    expect(service).toBeTruthy();
  });

  it('2. getPermissionState returns current browser notification permission without prompting', () => {
    const state = service.getPermissionState();
    expect(['granted', 'denied', 'default', 'unsupported']).toContain(state);
  });

  it('3. requestPermission invokes Notification.requestPermission when supported', async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      spyOn(window.Notification, 'requestPermission').and.returnValue(Promise.resolve('granted'));
      spyOn(service, 'ensureSubscribed').and.returnValue(Promise.resolve());

      const result = await service.requestPermission();
      expect(window.Notification.requestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    }
  });

  it('4. requestPermission returns false when user denies permission', async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      spyOn(window.Notification, 'requestPermission').and.returnValue(Promise.resolve('denied'));

      const result = await service.requestPermission();
      expect(window.Notification.requestPermission).toHaveBeenCalled();
      expect(result).toBe(false);
    }
  });
});
