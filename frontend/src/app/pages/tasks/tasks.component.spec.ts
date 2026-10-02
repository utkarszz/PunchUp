import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TasksComponent } from './tasks.component';
import { TaskService, Task } from '../../core/services/task.service';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

describe('TasksComponent - Task Due-Date & Overdue System', () => {
  let component: TasksComponent;
  let fixture: ComponentFixture<TasksComponent>;
  let mockTaskService: jasmine.SpyObj<TaskService>;
  let mockToastService: jasmine.SpyObj<ToastService>;

  const mockTasks: Task[] = [
    {
      _id: 'task_overdue_1',
      title: 'Incomplete Past Due Task',
      description: 'Overdue task description',
      priority: 'high',
      category: 'work',
      dueDate: new Date(Date.now() - 3600 * 1000 * 5).toISOString(), // 5 hours ago
      completed: false,
      user: 'user_1',
      createdAt: new Date(Date.now() - 3600 * 1000 * 29).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'task_completed_past_due',
      title: 'Completed Past Due Task',
      description: 'Completed yesterday',
      priority: 'medium',
      category: 'work',
      dueDate: new Date(Date.now() - 3600 * 1000 * 10).toISOString(), // 10 hours ago
      completed: true,
      completedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
      user: 'user_1',
      createdAt: new Date(Date.now() - 3600 * 1000 * 34).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      _id: 'task_today_future',
      title: 'Task Due Later Today',
      description: 'Due in 2 hours',
      priority: 'low',
      category: 'personal',
      dueDate: new Date(Date.now() + 3600 * 1000 * 2).toISOString(), // in 2 hours
      completed: false,
      user: 'user_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  beforeEach(async () => {
    mockTaskService = jasmine.createSpyObj('TaskService', [
      'getTasks',
      'createTask',
      'updateTask',
      'completeTask',
      'deleteTask',
    ]);
    mockToastService = jasmine.createSpyObj('ToastService', ['showSuccess', 'showInfo', 'showError']);

    mockTaskService.getTasks.and.returnValue(of({ success: true, count: mockTasks.length, tasks: JSON.parse(JSON.stringify(mockTasks)) }));

    await TestBed.configureTestingModule({
      imports: [TasksComponent],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
        { provide: ToastService, useValue: mockToastService },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TasksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('1. isOverdue correctly detects overdue when current time > dueDate AND completed === false', () => {
    const overdueTask = component.allTasks.find(t => t._id === 'task_overdue_1')!;
    expect(component.isOverdue(overdueTask)).toBe(true);
  });

  it('2. isOverdue returns FALSE for completed tasks even if dueDate is in the past', () => {
    const completedPastDueTask = component.allTasks.find(t => t._id === 'task_completed_past_due')!;
    expect(component.isOverdue(completedPastDueTask)).toBe(false);
  });

  it('3. isOverdue returns FALSE for pending tasks with future due date', () => {
    const futureTask = component.allTasks.find(t => t._id === 'task_today_future')!;
    expect(component.isOverdue(futureTask)).toBe(false);
  });

  it('4. Correctly categorizes overdue incomplete tasks into overdueTasks group', () => {
    expect(component.overdueTasks.length).toBe(1);
    expect(component.overdueTasks[0]._id).toBe('task_overdue_1');
  });

  it('5. Completing an overdue task immediately removes the overdue visual state', fakeAsync(() => {
    const overdueTask = component.overdueTasks[0];
    mockTaskService.completeTask.and.returnValue(
      of({
        success: true,
        message: 'Task completed successfully',
        task: { ...overdueTask, completed: true, completedAt: new Date().toISOString() },
        pointsAwarded: 10,
        league: 'Bronze',
      })
    );

    component.onComplete(overdueTask);

    // Immediately, completed is true and isOverdue is false
    expect(overdueTask.completed).toBe(true);
    expect(component.isOverdue(overdueTask)).toBe(false);
    expect(component.overdueTasks.length).toBe(0);

    tick(360);
    expect(mockTaskService.getTasks).toHaveBeenCalled();
  }));

  it('6. formatDueDate formats date and time naturally (e.g., "Oct 3, 10:00 PM")', () => {
    const sampleDate = '2026-10-03T22:00:00.000Z';
    const formatted = component.formatDueDate(sampleDate);
    expect(formatted).toBeTruthy();
    expect(formatted).toContain('Oct');
    expect(formatted).toContain(':');
  });

  it('7. Periodic timer updates UI when a task becomes overdue without manual refresh', () => {
    // Task initially due 2 seconds in the future
    const soonTask: Task = {
      _id: 'task_soon',
      title: 'Expiring Task',
      description: 'Expiring very soon',
      priority: 'high',
      category: 'work',
      dueDate: new Date(Date.now() + 1000).toISOString(), // 1s future
      completed: false,
      user: 'user_1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    component.allTasks = [soonTask];
    component.applyFilters();
    expect(component.isOverdue(soonTask)).toBe(false);
    expect(component.overdueTasks.length).toBe(0);

    // Advance time past due date
    soonTask.dueDate = new Date(Date.now() - 5000).toISOString();
    component.checkOverdueTransitions();

    expect(component.isOverdue(soonTask)).toBe(true);
    expect(component.overdueTasks.length).toBe(1);
    expect(component.overdueTasks[0]._id).toBe('task_soon');
  });

  it('8. Creating a task without specifying dueDate sends undefined to let backend assign 24h default', () => {
    mockTaskService.createTask.and.returnValue(
      of({
        success: true,
        task: {
          _id: 'new_task',
          title: 'Auto 24h Task',
          description: '',
          priority: 'medium',
          category: 'general',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          completed: false,
          user: 'user_1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
    );

    component.openCreateModal();
    component.modalTask.title = 'Auto 24h Task';
    component.modalTask.dueDate = ''; // left blank by user

    component.saveTask();

    expect(mockTaskService.createTask).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Auto 24h Task',
        dueDate: undefined,
      })
    );
  });

  it('9. Creating a task with explicit dueDate sends ISO formatted date string', () => {
    mockTaskService.createTask.and.returnValue(
      of({
        success: true,
        task: {
          _id: 'custom_task',
          title: 'Custom Due Date Task',
          description: '',
          priority: 'medium',
          category: 'general',
          dueDate: '2026-10-15T14:30:00.000Z',
          completed: false,
          user: 'user_1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
    );

    component.openCreateModal();
    component.modalTask.title = 'Custom Due Date Task';
    component.modalTask.dueDate = '2026-10-15T14:30';

    component.saveTask();

    expect(mockTaskService.createTask).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Custom Due Date Task',
        dueDate: jasmine.stringMatching(/2026-10-15/),
      })
    );
  });

  it('10. Renders overdue styling in DOM for overdue task and normal styling for completed task', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    const overdueGroup = compiled.querySelector('.group-label-overdue');
    expect(overdueGroup).toBeTruthy();

    const overdueCards = compiled.querySelectorAll('.card.task-card.overdue');
    expect(overdueCards.length).toBe(1);

    const overdueTag = compiled.querySelector('.overdue-tag');
    expect(overdueTag).toBeTruthy();
    expect(overdueTag?.textContent?.trim()).toBe('Overdue');

    const overdueTitle = compiled.querySelector('.task-title.text-overdue');
    expect(overdueTitle).toBeTruthy();
    expect(overdueTitle?.textContent?.trim()).toBe('Incomplete Past Due Task');
  });
});
