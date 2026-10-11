import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  totalPoints: number;
  weeklyPoints?: number;
  league: string;
}

export interface FocusLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  totalPoints: number;
  league: string;
  durationSeconds: number;
  focusTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class LeaderboardService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/leaderboard`;

  public getOverallLeaderboard(): Observable<{ success: boolean; leaderboard: LeaderboardEntry[]; currentUserRank?: LeaderboardEntry | null }> {
    return this.http.get<{ success: boolean; leaderboard: LeaderboardEntry[]; currentUserRank?: LeaderboardEntry | null }>(`${this.baseUrl}/overall`);
  }

  public getWeeklyLeaderboard(): Observable<{ success: boolean; weekStart: string; leaderboard: LeaderboardEntry[]; currentUserRank?: LeaderboardEntry | null }> {
    return this.http.get<{ success: boolean; weekStart: string; leaderboard: LeaderboardEntry[]; currentUserRank?: LeaderboardEntry | null }>(`${this.baseUrl}/weekly`);
  }

  public getLeagueLeaderboard(league: string): Observable<{ success: boolean; league: string; leaderboard: LeaderboardEntry[]; currentUserRank?: LeaderboardEntry | null }> {
    return this.http.get<{ success: boolean; league: string; leaderboard: LeaderboardEntry[]; currentUserRank?: LeaderboardEntry | null }>(`${this.baseUrl}/league/${league}`);
  }

  public getFocusLeaderboard(period: string = 'daily', timeZone?: string): Observable<{ success: boolean; period: string; leaderboard: FocusLeaderboardEntry[]; currentUserRank?: FocusLeaderboardEntry | null }> {
    const tz = timeZone || (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC');
    return this.http.get<{ success: boolean; period: string; leaderboard: FocusLeaderboardEntry[]; currentUserRank?: FocusLeaderboardEntry | null }>(
      `${this.baseUrl}/focus?period=${period}&timeZone=${encodeURIComponent(tz || 'UTC')}`
    );
  }
}
