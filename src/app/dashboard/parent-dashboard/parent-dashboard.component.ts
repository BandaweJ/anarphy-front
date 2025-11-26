import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { Subject, filter, switchMap, take, takeUntil } from 'rxjs';
import { StudentsModel } from 'src/app/registration/models/students.model';
import { Theme, ThemeService } from 'src/app/services/theme.service';
import { SystemSettingsService, SystemSettings } from 'src/app/system/services/system-settings.service';
import { selectUser } from 'src/app/auth/store/auth.selectors';
import { User } from 'src/app/auth/models/user.model';
import { ROLES } from 'src/app/registration/models/roles.enum';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, HttpClientModule],
  templateUrl: './parent-dashboard.component.html',
  styleUrls: ['./parent-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentDashboardComponent implements OnInit, OnDestroy {
  currentTheme: Theme = 'light';
  systemSettings: SystemSettings | null = null;
  children: StudentsModel[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private themeService: ThemeService,
    private systemSettingsService: SystemSettingsService,
    private http: HttpClient,
    private store: Store,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme) => {
        this.currentTheme = theme;
        this.cdr.markForCheck();
      });

    this.systemSettingsService
      .getSettings()
      .pipe(takeUntil(this.destroy$))
      .subscribe((settings) => {
        this.systemSettings = settings;
        this.cdr.markForCheck();
      });

    this.loadChildrenForLoggedInParent();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadChildrenForLoggedInParent(): void {
    this.store
      .select(selectUser)
      .pipe(
        filter((user): user is User => !!user && !!user.id),
        take(1),
        switchMap((user) => {
          if (user.role !== ROLES.parent) {
            return [];
          }
          const url = `${environment.apiUrl}/parents/${encodeURIComponent(user.id)}/students`;
          return this.http.get<StudentsModel[]>(url);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (children) => {
          // If switchMap returned a non-HTTP observable (e.g. empty array for non-parent),
          // just ignore and keep children as empty.
          if (Array.isArray(children)) {
            this.children = children;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Failed to load children for parent dashboard', error);
        },
      });
  }

  openStudentProfile(child: StudentsModel): void {
    this.router.navigate(['/student-view', child.studentNumber]);
  }

  openStudentReports(child: StudentsModel): void {
    this.router.navigate(['/reports'], {
      queryParams: { studentNumber: child.studentNumber },
    });
  }

  openStudentMarks(child: StudentsModel): void {
    this.router.navigate(['/results-analysis'], {
      queryParams: { studentNumber: child.studentNumber },
    });
  }

  openStudentFinancials(child: StudentsModel): void {
    this.router.navigate(['/student-financials'], {
      queryParams: { studentNumber: child.studentNumber },
    });
  }
}


