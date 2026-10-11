import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeaderboardComponent } from './leaderboard.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, BehaviorSubject } from 'rxjs';
import { AuthService, UserProfile } from '../../core/services/auth.service';
import { LeaderboardService, LeaderboardEntry, FocusLeaderboardEntry } from '../../core/services/leaderboard.service';
import { By } from '@angular/platform-browser';

describe('LeaderboardComponent - Layout Restoration & User Highlight', () => {
  let component: LeaderboardComponent;
  let fixture: ComponentFixture<LeaderboardComponent>;
  let leaderboardServiceSpy: jasmine.SpyObj<LeaderboardService>;
  let currentUserSubject: BehaviorSubject<UserProfile | null>;

  const mockUser: UserProfile = {
    _id: 'user_123',
    username: 'testrunner',
    email: 'test@example.com',
    displayName: 'Test Runner',
    totalPoints: 450
  };

  const mockLeaderboardEntries: LeaderboardEntry[] = [
    {
      rank: 1,
      userId: 'user_other_1',
      username: 'champion',
      displayName: 'The Champ',
      totalPoints: 1000,
      league: 'Diamond'
    },
    {
      rank: 2,
      userId: 'user_123',
      username: 'testrunner',
      displayName: 'Test Runner',
      totalPoints: 450,
      league: 'Gold'
    },
    {
      rank: 3,
      userId: 'user_other_3',
      username: 'bronzer',
      displayName: 'Bronze Hero',
      totalPoints: 300,
      league: 'Silver'
    },
    {
      rank: 4,
      userId: 'user_other_4',
      username: 'fourth',
      displayName: 'Fourth Place',
      totalPoints: 200,
      league: 'Silver'
    }
  ];

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<UserProfile | null>(mockUser);
    leaderboardServiceSpy = jasmine.createSpyObj('LeaderboardService', [
      'getWeeklyLeaderboard',
      'getOverallLeaderboard',
      'getLeagueLeaderboard',
      'getFocusLeaderboard'
    ]);

    leaderboardServiceSpy.getWeeklyLeaderboard.and.returnValue(
      of({ success: true, weekStart: new Date().toISOString(), leaderboard: mockLeaderboardEntries })
    );
    leaderboardServiceSpy.getOverallLeaderboard.and.returnValue(
      of({ success: true, leaderboard: mockLeaderboardEntries })
    );
    leaderboardServiceSpy.getLeagueLeaderboard.and.returnValue(
      of({ success: true, league: 'Gold', leaderboard: mockLeaderboardEntries })
    );
    leaderboardServiceSpy.getFocusLeaderboard.and.returnValue(
      of({ success: true, period: 'daily', leaderboard: [] })
    );

    const authServiceStub = {
      currentUser$: currentUserSubject.asObservable(),
      currentUserValue: mockUser
    };

    await TestBed.configureTestingModule({
      imports: [LeaderboardComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: LeaderboardService, useValue: leaderboardServiceSpy },
        { provide: AuthService, useValue: authServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LeaderboardComponent);
    component = fixture.componentInstance;
  });

  it('should initialize and not render a separate "YOUR STANDING" card', () => {
    component.selectMode('points');
    fixture.detectChanges();

    const standingCard = fixture.debugElement.query(By.css('.your-rank-summary-card'));
    expect(standingCard).toBeNull();
  });

  it('should render the authenticated user once inside the normal list without duplicating their row', () => {
    component.selectMode('points');
    fixture.detectChanges();

    const userRows = fixture.debugElement.queryAll(By.css('.rank-card'));
    expect(userRows.length).toBe(4);

    const currentUserCards = fixture.debugElement.queryAll(By.css('.current-user-card'));
    expect(currentUserCards.length).toBe(1);

    const highlightedText = currentUserCards[0].nativeElement.textContent;
    expect(highlightedText).toContain('Test Runner');
    expect(highlightedText).toContain('@testrunner');
  });

  it('should preserve top-three medal classes and styling intact', () => {
    component.selectMode('points');
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('.rank-card'));
    expect(cards[0].nativeElement.classList).toContain('top-one');
    expect(cards[1].nativeElement.classList).toContain('top-two');
    expect(cards[2].nativeElement.classList).toContain('top-three');
    expect(cards[3].nativeElement.classList).not.toContain('top-one');
    expect(cards[3].nativeElement.classList).not.toContain('top-two');
    expect(cards[3].nativeElement.classList).not.toContain('top-three');
  });

  it('should identify the current user by userId matching', () => {
    const itemMatch: LeaderboardEntry = {
      rank: 5,
      userId: 'user_123',
      username: 'some_other_name',
      totalPoints: 100,
      league: 'Rookie'
    };
    const itemDiff: LeaderboardEntry = {
      rank: 6,
      userId: 'user_999',
      username: 'testrunner',
      totalPoints: 90,
      league: 'Rookie'
    };

    fixture.detectChanges();
    expect(component.isCurrentUser(itemMatch)).toBeTrue();
    expect(component.isCurrentUser(itemDiff)).toBeFalse();
  });

  it('should not inject the user into the list if user is outside top results', () => {
    const outsideEntries: LeaderboardEntry[] = [
      {
        rank: 1,
        userId: 'top_1',
        username: 'top1',
        totalPoints: 900,
        league: 'Diamond'
      }
    ];

    leaderboardServiceSpy.getWeeklyLeaderboard.and.returnValue(
      of({
        success: true,
        weekStart: new Date().toISOString(),
        leaderboard: outsideEntries,
        currentUserRank: {
          rank: 75,
          userId: 'user_123',
          username: 'testrunner',
          totalPoints: 10,
          league: 'Rookie'
        }
      })
    );

    component.selectMode('points');
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('.rank-card'));
    expect(cards.length).toBe(1);

    const currentUserCards = fixture.debugElement.queryAll(By.css('.current-user-card'));
    expect(currentUserCards.length).toBe(0);

    const standingCard = fixture.debugElement.query(By.css('.your-rank-summary-card'));
    expect(standingCard).toBeNull();
  });
});
