import { Injectable } from '@angular/core';
import { Actions, ofType, createEffect } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, exhaustMap, map, tap } from 'rxjs/operators';
import {
  signinActions,
  signupActions,
  accountStatsActions,
  userDetailsActions,
  logout,
  checkAuthStatus,
  // No need to import signinFailure directly now, it's part of signinActions
} from './auth.actions';
import { AuthService } from '../auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import jwt_decode from 'jwt-decode';
import { User } from '../models/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ROLES } from 'src/app/registration/models/roles.enum';

@Injectable()
export class AuthEffects {
  constructor(
    private actions$: Actions,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  signinEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(signinActions.signin), // Use grouped action
      exhaustMap((credentials) =>
        this.authService.signin(credentials.signinData).pipe(
          map((resp) => {
            const user: User = jwt_decode(resp.accessToken);
            
            // Add permissions to user object from login response
            if (resp.permissions) {
              user.permissions = resp.permissions;
            }

            localStorage.setItem('token', resp.accessToken);

            const payload = {
              ...resp,
              user,
            };

            // Redirect based on user role / bootstrap status
            if (resp.isBootstrap) {
              this.router.navigateByUrl('/teachers');
            } else if (user.role === ROLES.parent) {
              this.router.navigateByUrl('/parent-dashboard');
            } else {
              this.router.navigateByUrl('/dashboard');
            }
            return signinActions.signinSuccess(payload); // Use grouped action
          }),
          catchError(
            (error: HttpErrorResponse) =>
              of(signinActions.signinFailure({ error })) // Use grouped action
          )
        )
      )
    )
  );

  signupEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(signupActions.signup), // Use grouped action
      exhaustMap((credentials) =>
        this.authService.signup(credentials.signupData).pipe(
          tap(() =>
            this.snackBar.open('Account created successfully', 'Close', {
              duration: 3000,
            })
          ),
          map((resp) => {
            return signupActions.signupSuccess(resp); // Use grouped action
          }),
          catchError(
            (error: HttpErrorResponse) =>
              of(signupActions.signupFailure({ error })) // Use grouped action
          )
        )
      )
    )
  );

  fetchAccountsStatsEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(accountStatsActions.fetchAccountStats), // Use grouped action
      exhaustMap(() =>
        this.authService.getAccountsStats().pipe(
          map((stats) => {
            return accountStatsActions.fetchAccountStatsSuccess({ stats }); // Use grouped action
          }),
          catchError(
            (error: HttpErrorResponse) =>
              of(accountStatsActions.fetchAccountStatsFailure({ error })) // Use grouped action
          )
        )
      )
    )
  );

  fetchUserDetails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(userDetailsActions.fetchUser), // Use grouped action
      exhaustMap((data) =>
        this.authService.fetchUserDetails(data.id, data.role).pipe(
          map((user) => {
            return userDetailsActions.fetchUserSuccess({
              user,
            }); // Use grouped action
          }),
          catchError(
            (error: HttpErrorResponse) =>
              of(
                userDetailsActions.fetchUserFail({
                  error,
                })
              ) // Use grouped action
          )
        )
      )
    )
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(logout), // Still an individual action
        tap(() => {
          // Clear all authentication-related data from localStorage
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('jhs_session');
          // Note: We keep 'theme' and 'jhs-theme' as they are user preferences, not auth data
          // We keep 'rememberUsername' as it's a convenience feature
          
          // Don't redirect if user is on a public route
          const windowPath = typeof window !== 'undefined' ? window.location.pathname : '';
          const routerUrl = this.router.url || this.router.routerState.snapshot.url || '';
          const currentUrl = (windowPath || routerUrl).split('?')[0].toLowerCase();
          
          const publicRoutes = ['/signin', '/signup', '/apply', '/track-application'];
          const isPublicRoute = publicRoutes.some(route => {
            const normalizedRoute = route.toLowerCase();
            return currentUrl === normalizedRoute || currentUrl.startsWith(normalizedRoute + '/');
          });
          
          // Only redirect to signin if not on a public route
          if (!isPublicRoute) {
            this.router.navigateByUrl('/signin');
          }
        })
      ),
    { dispatch: false }
  );

  checkAuthStatus$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(checkAuthStatus), // Still an individual action
        map(() => {
          const authStatus = this.authService.getAuthStatus();

          if (
            authStatus.isLoggedIn &&
            authStatus.user &&
            authStatus.accessToken
          ) {
            // Check current route - don't redirect away from public routes
            const windowPath = typeof window !== 'undefined' ? window.location.pathname : '';
            const routerUrl = this.router.url || this.router.routerState.snapshot.url || '';
            const currentUrl = (windowPath || routerUrl).split('?')[0].toLowerCase();
            
            const publicRoutes = ['/signin', '/signup', '/apply', '/track-application'];
            const isPublicRoute = publicRoutes.some(route => {
              const normalizedRoute = route.toLowerCase();
              return currentUrl === normalizedRoute || currentUrl.startsWith(normalizedRoute + '/');
            });
            
            // If user is logged in and on signin/signup page, redirect to dashboard
            if (isPublicRoute && (currentUrl === '/signin' || currentUrl === '/signup')) {
              // User is logged in but on signin page, redirect to appropriate dashboard
              if (authStatus.user.isBootstrap) {
                this.router.navigateByUrl('/teachers');
              } else if (authStatus.user.role === ROLES.parent) {
                this.router.navigateByUrl('/parent-dashboard');
              } else {
                this.router.navigateByUrl('/dashboard');
              }
            }
            // If user is on root path and logged in, redirect to dashboard
            else if (currentUrl === '/' || currentUrl === '') {
              if (authStatus.user.isBootstrap) {
                this.router.navigateByUrl('/teachers');
              } else if (authStatus.user.role === ROLES.parent) {
                this.router.navigateByUrl('/parent-dashboard');
              } else {
                this.router.navigateByUrl('/dashboard');
              }
            }
            // Otherwise, stay on current route (user is already on a valid route)
            
            return signinActions.signinSuccess({
              // Use grouped action for dispatch
              user: authStatus.user,
              accessToken: authStatus.accessToken,
            });
          } else {
            localStorage.removeItem('token');
            
            // Don't redirect if user is on a public route
            // Use window.location.pathname first as it's always available, even before router processes the route
            const windowPath = typeof window !== 'undefined' ? window.location.pathname : '';
            const routerUrl = this.router.url || this.router.routerState.snapshot.url || '';
            const currentUrl = (windowPath || routerUrl).split('?')[0].toLowerCase(); // Remove query params and normalize
            
            const publicRoutes = ['/signin', '/signup', '/apply', '/track-application'];
            const isPublicRoute = publicRoutes.some(route => {
              const normalizedRoute = route.toLowerCase();
              return currentUrl === normalizedRoute || currentUrl.startsWith(normalizedRoute + '/');
            });
            
            // Only redirect if not on a public route and not on root
            // If on root, let the default route handle the redirect
            if (!isPublicRoute && currentUrl !== '/' && currentUrl !== '') {
              this.router.navigateByUrl('/signin');
            }
            
            return logout(); // Still an individual action
          }
        })
      )
    // No `dispatch: false` because this effect explicitly dispatches `signinSuccess` or `logout`.
  );
}
