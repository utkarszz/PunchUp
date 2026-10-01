import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommunityComponent } from './community.component';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError, BehaviorSubject, Subject } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { FollowService } from '../../core/services/follow.service';
import { PostService, Post } from '../../core/services/post.service';
import { ToastService } from '../../core/services/toast.service';
import { By } from '@angular/platform-browser';

describe('CommunityComponent - Follow Button UI & Logic', () => {
  let component: CommunityComponent;
  let fixture: ComponentFixture<CommunityComponent>;
  let followServiceSpy: jasmine.SpyObj<FollowService>;
  let postServiceSpy: jasmine.SpyObj<PostService>;
  let toastServiceSpy: jasmine.SpyObj<ToastService>;
  let currentUserSubject: BehaviorSubject<any>;

  const mockCurrentUser = {
    _id: 'user_me_id',
    username: 'myusername',
    displayName: 'My Name',
    profilePicture: '',
    totalPoints: 120
  };

  const mockPosts: Post[] = [
    {
      _id: 'post_1',
      content: 'Hello from another user',
      user: {
        _id: 'user_other_1',
        username: 'alice',
        displayName: 'Alice Smith',
        profilePicture: '',
        totalPoints: 50 // Rookie
      },
      likes: [],
      saves: [],
      commentsCount: 0,
      createdAt: new Date().toISOString()
    },
    {
      _id: 'post_2',
      content: 'Hello from Bob who I already follow',
      user: {
        _id: 'user_other_2',
        username: 'bob',
        displayName: 'Bob Builder',
        profilePicture: '',
        totalPoints: 750 // Gold
      },
      likes: [],
      saves: [],
      commentsCount: 0,
      createdAt: new Date().toISOString()
    },
    {
      _id: 'post_3',
      content: 'This is my own post',
      user: {
        _id: 'user_me_id',
        username: 'myusername',
        displayName: 'My Name',
        profilePicture: '',
        totalPoints: 120 // Bronze
      },
      likes: [],
      saves: [],
      commentsCount: 0,
      createdAt: new Date().toISOString()
    }
  ];

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<any>(mockCurrentUser);
    const authServiceMock = {
      currentUser$: currentUserSubject.asObservable(),
      currentUserValue: mockCurrentUser
    };

    followServiceSpy = jasmine.createSpyObj('FollowService', ['getFollowing', 'getSuggestions', 'follow', 'unfollow']);
    postServiceSpy = jasmine.createSpyObj('PostService', ['getFeed', 'searchCommunity']);
    toastServiceSpy = jasmine.createSpyObj('ToastService', ['showError', 'showSuccess']);

    followServiceSpy.getFollowing.and.returnValue(of({
      success: true,
      following: [
        { _id: 'f1', following: { _id: 'user_other_2', username: 'bob' } } as any
      ]
    }));
    followServiceSpy.getSuggestions.and.returnValue(of({ success: true, users: [] }));
    postServiceSpy.getFeed.and.returnValue(of({
      success: true,
      posts: [
        {
          _id: 'post_1',
          content: 'Hello from another user',
          user: {
            _id: 'user_other_1',
            username: 'alice',
            displayName: 'Alice Smith',
            profilePicture: '',
            totalPoints: 50 // Rookie
          },
          likes: [],
          saves: [],
          commentsCount: 0,
          createdAt: new Date().toISOString()
        },
        {
          _id: 'post_2',
          content: 'Hello from Bob who I already follow',
          user: {
            _id: 'user_other_2',
            username: 'bob',
            displayName: 'Bob Builder',
            profilePicture: '',
            totalPoints: 750 // Gold
          },
          likes: [],
          saves: [],
          commentsCount: 0,
          createdAt: new Date().toISOString()
        },
        {
          _id: 'post_3',
          content: 'This is my own post',
          user: {
            _id: 'user_me_id',
            username: 'myusername',
            displayName: 'My Name',
            profilePicture: '',
            totalPoints: 120 // Bronze
          },
          likes: [],
          saves: [],
          commentsCount: 0,
          createdAt: new Date().toISOString()
        }
      ]
    }));

    await TestBed.configureTestingModule({
      imports: [CommunityComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: AuthService, useValue: authServiceMock },
        { provide: FollowService, useValue: followServiceSpy },
        { provide: PostService, useValue: postServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CommunityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize followingSet from existing following list on load', () => {
    expect(component.followingSet.has('bob')).toBeTrue();
    expect(component.followingSet.has('alice')).toBeFalse();
    expect(component.isFollowing('bob')).toBeTrue();
    expect(component.isFollowing('alice')).toBeFalse();
  });

  it('should render league badge beside user name in post header', () => {
    const postCards = fixture.debugElement.queryAll(By.css('.post-card'));
    expect(postCards.length).toBe(3);

    const firstCardBadge = postCards[0].query(By.css('app-league-badge'));
    expect(firstCardBadge).toBeTruthy();
    expect(firstCardBadge.nativeElement.textContent).toContain('Rookie');
  });

  it('should NOT render Follow button on own posts', () => {
    const postCards = fixture.debugElement.queryAll(By.css('.post-card'));
    // Third post is own post
    const ownPostCard = postCards[2];
    const followBtn = ownPostCard.query(By.css('.post-follow-btn'));
    expect(followBtn).toBeNull();
    expect(component.isOwnPost(mockPosts[2])).toBeTrue();
  });

  it('should render "Follow" for authors not followed, and "Following" for authors already followed', () => {
    const postCards = fixture.debugElement.queryAll(By.css('.post-card'));

    // First post: Alice (not followed)
    const aliceBtn = postCards[0].query(By.css('.post-follow-btn'));
    expect(aliceBtn).toBeTruthy();
    expect(aliceBtn.nativeElement.textContent.trim()).toBe('Follow');
    expect(aliceBtn.nativeElement.classList.contains('following')).toBeFalse();

    // Second post: Bob (already followed)
    const bobBtn = postCards[1].query(By.css('.post-follow-btn'));
    expect(bobBtn).toBeTruthy();
    expect(bobBtn.nativeElement.textContent.trim()).toBe('Following');
    expect(bobBtn.nativeElement.classList.contains('following')).toBeTrue();
  });

  it('should follow user optimistically and update button to "Following" on click', fakeAsync(() => {
    followServiceSpy.follow.and.returnValue(of({ success: true }));

    const postCards = fixture.debugElement.queryAll(By.css('.post-card'));
    const aliceBtn = postCards[0].query(By.css('.post-follow-btn'));

    aliceBtn.nativeElement.click();
    fixture.detectChanges();

    // Optimistically updated
    expect(component.isFollowing('alice')).toBeTrue();
    expect(aliceBtn.nativeElement.textContent.trim()).toBe('Following');
    expect(aliceBtn.nativeElement.classList.contains('following')).toBeTrue();
    expect(followServiceSpy.follow).toHaveBeenCalledWith('alice');

    tick();
    expect(component.isFollowLoading('alice')).toBeFalse();
  }));

  it('should unfollow user optimistically and update button to "Follow" on click', fakeAsync(() => {
    followServiceSpy.unfollow.and.returnValue(of({ success: true }));

    const postCards = fixture.debugElement.queryAll(By.css('.post-card'));
    const bobBtn = postCards[1].query(By.css('.post-follow-btn'));

    bobBtn.nativeElement.click();
    fixture.detectChanges();

    // Optimistically updated
    expect(component.isFollowing('bob')).toBeFalse();
    expect(bobBtn.nativeElement.textContent.trim()).toBe('Follow');
    expect(bobBtn.nativeElement.classList.contains('following')).toBeFalse();
    expect(followServiceSpy.unfollow).toHaveBeenCalledWith('bob');

    tick();
    expect(component.isFollowLoading('bob')).toBeFalse();
  }));

  it('should prevent duplicate requests from rapid clicks while request is pending', () => {
    // Subject that doesn't immediately complete
    const pendingSubject = new Subject<any>();
    followServiceSpy.follow.and.returnValue(pendingSubject.asObservable());

    component.toggleFollow('alice');
    expect(component.isFollowLoading('alice')).toBeTrue();
    expect(followServiceSpy.follow.calls.count()).toBe(1);

    // Second click while loading
    component.toggleFollow('alice');
    expect(followServiceSpy.follow.calls.count()).toBe(1); // not called again
  });

  it('should rollback optimistic update and show error toast on API failure', fakeAsync(() => {
    followServiceSpy.follow.and.returnValue(throwError(() => ({
      error: { message: 'Network connection lost' }
    })));

    expect(component.isFollowing('alice')).toBeFalse();

    const postCards = fixture.debugElement.queryAll(By.css('.post-card'));
    const aliceBtn = postCards[0].query(By.css('.post-follow-btn'));

    aliceBtn.nativeElement.click();
    tick();
    fixture.detectChanges();

    // Rolled back to previous state
    expect(component.isFollowing('alice')).toBeFalse();
    expect(aliceBtn.nativeElement.textContent.trim()).toBe('Follow');
    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Network connection lost');
    expect(component.isFollowLoading('alice')).toBeFalse();
  }));

  it('should sync all post cards when following an author with multiple posts', fakeAsync(() => {
    followServiceSpy.follow.and.returnValue(of({ success: true }));

    // Add another post by alice
    component.posts.push({
      _id: 'post_4',
      content: 'Another post by Alice',
      user: {
        _id: 'user_other_1',
        username: 'alice',
        displayName: 'Alice Smith',
        totalPoints: 50
      },
      likes: [],
      saves: [],
      commentsCount: 0,
      createdAt: new Date().toISOString()
    });
    fixture.detectChanges();

    const postCards = fixture.debugElement.queryAll(By.css('.post-card'));
    const firstAliceBtn = postCards[0].query(By.css('.post-follow-btn'));
    const secondAliceBtn = postCards[3].query(By.css('.post-follow-btn'));

    expect(firstAliceBtn.nativeElement.textContent.trim()).toBe('Follow');
    expect(secondAliceBtn.nativeElement.textContent.trim()).toBe('Follow');

    // Click follow on the first post
    firstAliceBtn.nativeElement.click();
    fixture.detectChanges();

    // Both buttons should immediately be "Following"
    expect(firstAliceBtn.nativeElement.textContent.trim()).toBe('Following');
    expect(secondAliceBtn.nativeElement.textContent.trim()).toBe('Following');
    expect(component.isFollowing('alice')).toBeTrue();
    tick();
  }));

  it('should handle username case insensitivity correctly', () => {
    component.followingSet.add('charlie');
    expect(component.isFollowing('Charlie')).toBeTrue();
    expect(component.isFollowing('CHARLIE')).toBeTrue();
    expect(component.isFollowing('charlie')).toBeTrue();
  });

  it('should correctly identify own post even if username has different casing', () => {
    const postWithDifferentCase: Post = {
      _id: 'post_case',
      content: 'Case test',
      user: {
        _id: 'different_id',
        username: 'MYUSERNAME', // uppercase of current user's 'myusername'
        displayName: 'My Name'
      },
      likes: [],
      saves: [],
      createdAt: new Date().toISOString()
    };
    expect(component.isOwnPost(postWithDifferentCase)).toBeTrue();
  });
});
