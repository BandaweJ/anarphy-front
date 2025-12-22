import {
  Component,
  ViewChild,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Observable, Subject, of } from 'rxjs';
import { takeUntil, map, shareReplay, catchError } from 'rxjs/operators';
import { MediaMatcher } from '@angular/cdk/layout';
import { Store } from '@ngrx/store';
import { selectIsLoggedIn, selectUser } from './auth/store/auth.selectors';
import { checkAuthStatus } from './auth/store/auth.actions';
import { ThemeService, Theme } from './services/theme.service';
import { RoleAccessService } from './services/role-access.service';
import { ROLES } from './registration/models/roles.enum';
import { SystemSettingsService, SystemSettings } from './system/services/system-settings.service';
import { Title } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { MessagingService } from './messaging/services/messaging.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Junior High School';
  
  currentTheme: Theme = 'light';
  
  // School information from system settings
  schoolName$!: Observable<string>;
  schoolLogo$!: Observable<string>;
  schoolNameAbbr$!: Observable<string>;

  @ViewChild('sidenav') sidenav!: MatSidenav;

  isSidenavCollapsed: boolean = true; // Initial state: collapsed on large screens
  isScreenSmall: boolean = false;

  mobileQuery: MediaQueryList;
  private _mobileQueryListener: () => void;

  user$ = this.store.select(selectUser);
  role!: string;
  isLoggedIn$: Observable<boolean>; // Simulate logged-in state, typically from an auth service
  isLoggedInStatus!: boolean; // Store the actual boolean status for TS logic
  
  // Messaging unread count
  totalUnreadCount = 0;

  // Role-based access observables - these update when role changes
  canAccessRegistration$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.reception))
  );
  canAccessEnrolment$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.doesNotHaveRole(role, ROLES.student, ROLES.parent))
  );
  canAccessAttendance$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.teacher, ROLES.hod))
  );
  canAccessMarks$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.teacher, ROLES.hod))
  );
  canAccessResultsAnalysis$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.teacher, ROLES.hod, ROLES.director))
  );
  canAccessBilling$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.reception, ROLES.director, ROLES.auditor))
  );
  canAccessReceipting$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.auditor, ROLES.director, ROLES.reception))
  );
  canAccessFinancialReports$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.reception, ROLES.auditor, ROLES.director))
  );
  canAccessSystemAdmin$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasRole(ROLES.admin, role))
  );
  canAccessClassLists$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.reception, ROLES.teacher, ROLES.hod, ROLES.auditor, ROLES.director))
  );
  canAccessExemptions$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.auditor, ROLES.director, ROLES.reception))
  );
  canAccessRevenueRecognition$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.auditor, ROLES.director, ROLES.reception))
  );
  canAccessFeesCollection$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasAnyRole(role, ROLES.admin, ROLES.auditor, ROLES.director, ROLES.reception))
  );
  
  // Helper methods for specific role checks
  isAdmin$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasRole(ROLES.admin, role))
  );
  isReception$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasRole(ROLES.reception, role))
  );
  isStudent$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasRole(ROLES.student, role))
  );

  private destroy$ = new Subject<void>();

  constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private media: MediaMatcher,
    private store: Store,
    public themeService: ThemeService,  // Made public for template access
    public roleAccess: RoleAccessService,  // Made public for template access
    public router: Router,  // Made public for template access
    private systemSettingsService: SystemSettingsService,
    private titleService: Title,
    private dialog: MatDialog,
    private messagingService: MessagingService
  ) {
    this.mobileQuery = media.matchMedia('(max-width: 767px)');
    this._mobileQueryListener = () => {
      this.changeDetectorRef.detectChanges();
      this.checkScreenSize();
    };
    this.mobileQuery.addListener(this._mobileQueryListener);
    this.isLoggedIn$ = this.store.select(selectIsLoggedIn);
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.theme$.pipe(takeUntil(this.destroy$)).subscribe(theme => {
      this.currentTheme = theme;
    });
    
    // Load initial system settings
    this.systemSettingsService.getSettings().pipe(
      catchError(error => {
        console.error('Error loading system settings:', error);
        // Return default settings on error and update the service state
        const defaultSettings = {
          schoolName: 'Junior High School',
          schoolLogo: 'assets/anarphy_logo.png',
        } as SystemSettings;
        return of(defaultSettings);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
    
    // Subscribe to settings changes from the service
    const settings$ = this.systemSettingsService.settings$.pipe(
      filter(settings => settings !== null), // Only emit when settings are loaded
      shareReplay(1) // Cache the latest settings
    );
    
    // Initialize school information observables
    this.schoolName$ = settings$.pipe(
      map(settings => settings!.schoolName || 'Junior High School')
    );
    
    this.schoolLogo$ = settings$.pipe(
      map(settings => settings!.schoolLogo || 'assets/anarphy_logo.png')
    );
    
    this.schoolNameAbbr$ = settings$.pipe(
      map(settings => {
        const name = settings!.schoolName || 'Junior High School';
        // Generate abbreviation from school name (first letters of each word)
        return name
          .split(' ')
          .map(word => word.charAt(0).toUpperCase())
          .join('')
          .substring(0, 3) || 'JHS';
      })
    );
    
    // Update page title and apply school colors
    settings$.pipe(takeUntil(this.destroy$)).subscribe(settings => {
      const schoolName = settings!.schoolName || 'Junior High School';
      this.title = schoolName;
      this.titleService.setTitle(schoolName);
      
      // Apply school colors to theme
      if (settings!.primaryColor || settings!.accentColor || settings!.warnColor) {
        this.themeService.applySchoolColors({
          primaryColor: settings!.primaryColor,
          accentColor: settings!.accentColor,
          warnColor: settings!.warnColor,
        });
      }
    });
    
    this.store.dispatch(checkAuthStatus());

    this.checkScreenSize(); // Initial screen size check

    // Subscribe to isLoggedIn$ to update isLoggedInStatus
    this.isLoggedIn$.pipe(takeUntil(this.destroy$)).subscribe((loggedIn) => {
      this.isLoggedInStatus = loggedIn;
      // Re-evaluate sidenav state and margin when login status changes
      this.checkScreenSize(); // This will ensure sidenav opens/closes based on isLoggedInStatus
      this.changeDetectorRef.detectChanges(); // Force update view to reflect margin change
    });

    this.user$.pipe(takeUntil(this.destroy$)).subscribe((user) => {
      if (user) {
        this.role = user.role;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.mobileQuery.removeListener(this._mobileQueryListener);
  }

  checkScreenSize() {
    this.isScreenSmall = this.mobileQuery.matches;

    if (this.isScreenSmall) {
      // On small screens, ensure sidenav is closed (over mode)
      this.sidenav?.close();
      this.isSidenavCollapsed = false; // Collapsed state is irrelevant for width on overlay mode
    } else {
      // On large screens, manage sidenav open/close based on login status
      if (this.isLoggedInStatus) {
        // Only open if logged in
        this.sidenav?.open();
      } else {
        this.sidenav?.close(); // Explicitly close if not logged in on large screen
      }
      this.isSidenavCollapsed = true; // Ensure it starts collapsed on large screens
    }
  }

  onSidenavOpenedChange(isOpen: boolean) {
    if (!this.isScreenSmall) {
      // Only manage isSidenavCollapsed on large screens (for side mode)
      this.isSidenavCollapsed = !isOpen;
    }
  }

  openCalendar(): void {
    // Navigate to calendar route or open calendar dialog
    this.router.navigate(['/calendar']);
  }
}
