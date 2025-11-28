import { Component, OnInit, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  Subscription,
  switchMap,
  take,
  tap,
  catchError,
} from 'rxjs';
import { selectUser } from 'src/app/auth/store/auth.selectors';
import { StudentDashboardSummary } from '../models/student-dashboard-summary';
import {
  selectStudentDashboardLoaded,
  selectStudentDashboardLoading,
  selectStudentDashboardSummary,
} from '../store/dashboard.selectors';
import { studentDashboardActions } from '../store/dashboard.actions';
import { User } from 'src/app/auth/models/user.model';

import { EnrolsModel } from 'src/app/enrolment/models/enrols.model';
import {
  selectCurrentEnrolment,
  selectCurrentEnrolmentLoaded,
  selectCurrentEnrolmentLoading,
  selectLatestEnrolment,
  selectLatestEnrolmentStatus,
  selectLatestEnrolmentLoading,
  selectLatestEnrolmentLoaded,
} from 'src/app/enrolment/store/enrolment.selectors';
import { currentEnrolementActions } from 'src/app/enrolment/store/enrolment.actions';
import { StudentsModel } from 'src/app/registration/models/students.model';
import {
  invoiceActions,
  receiptActions,
} from 'src/app/finance/store/finance.actions';
import { selectStudentBalance } from 'src/app/finance/store/finance.selector';
import { ContinuousAssessmentService, ContinuousAssessmentAnalytics } from 'src/app/marks/continuous-assessment/continuous-assessment.service';
import { StudentsService } from 'src/app/registration/services/students.service';

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css'],
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  public dashboardSummary$: Observable<StudentDashboardSummary | null>;
  public summaryLoading$: Observable<boolean>;
  public summaryLoaded$: Observable<boolean>;

  public studentDetails$: Observable<StudentsModel | null>;
  public latestEnrolment$: Observable<EnrolsModel | null>;
  public latestEnrolmentStatus$: Observable<'past' | 'current' | 'upcoming' | null>;
  public enrolmentLoading$: Observable<boolean>;
  public enrolmentLoaded$: Observable<boolean>;
  
  // Amount owed calculated from store (single source of truth)
  // Value will display when it becomes available
  public amountOwed$: Observable<number>;

  public caAnalytics: ContinuousAssessmentAnalytics | null = null;
  public caLoading = false;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private store: Store, 
    private caService: ContinuousAssessmentService,
    private studentsService: StudentsService
  ) {
    this.dashboardSummary$ = this.store.select(selectStudentDashboardSummary);
    this.summaryLoading$ = this.store.select(selectStudentDashboardLoading);
    this.summaryLoaded$ = this.store.select(selectStudentDashboardLoaded);

    this.latestEnrolment$ = this.store.select(selectLatestEnrolment);
    this.latestEnrolmentStatus$ = this.store.select(selectLatestEnrolmentStatus);
    this.enrolmentLoading$ = this.store.select(selectLatestEnrolmentLoading);
    this.enrolmentLoaded$ = this.store.select(selectLatestEnrolmentLoaded);

    // Fetch student details independently of enrolment
    // First try from latest enrolment, then fetch directly by student number
    this.studentDetails$ = combineLatest([
      this.latestEnrolment$,
      this.store.select(selectUser)
    ]).pipe(
      switchMap(([enrolment, user]) => {
        // If enrolment has student, use it
        if (enrolment?.student) {
          return of(enrolment.student);
        }
        // Otherwise, fetch student directly by student number
        if (user?.id) {
          return this.studentsService.getStudent(user.id).pipe(
            catchError(() => of(null))
          );
        }
        return of(null);
      })
    );
    
    // Calculate amount owed using student-specific invoices and receipts (more efficient)
    // Data should already be loaded by the component's ngOnInit (dispatches fetchStudentInvoices/fetchStudentReceipts)
    // Simply use the selector - value will display when it becomes available
    this.amountOwed$ = (this.store.select(selectUser) as Observable<User | null>).pipe(
      filter((user): user is User => !!user && !!user.id),
      switchMap(() => this.store.select(selectStudentBalance))
    );
  }

  ngOnInit(): void {
    this.subscriptions.add(
      (this.store.select(selectUser) as Observable<User | null>)
        .pipe(
          // Filter for a valid user with an ID
          filter((user): user is User => !!user && !!user.id),
          // Take only the first emission to prevent multiple dispatches
          take(1),
          // Use a tap operator to perform side-effects (dispatching actions)
          // This runs as soon as a valid user is found
          tap((user) => {
            const studentNumber = user.id;

            // Fetch only this student's invoices and receipts (more efficient than fetching all)
            this.store.dispatch(
              invoiceActions.fetchStudentInvoices({
                studentNumber,
              })
            );
            this.store.dispatch(
              receiptActions.fetchStudentReceipts({
                studentNumber,
              })
            );
            this.store.dispatch(
              studentDashboardActions.fetchStudentDashboardSummary({
                studentNumber,
              })
            );
            this.store.dispatch(
              currentEnrolementActions.fetchLatestEnrolmentWithStatus({
                studentNumber,
              })
            );
            this.loadContinuousAssessmentAnalytics(studentNumber);
          })
        )
        .subscribe()
    );

    // REVISED Dashboard Summary & Enrolment Data Fetching (already good, just including for completeness)
    this.subscriptions.add(
      (this.store.select(selectUser) as Observable<User | null>)
        .pipe(
          filter((user): user is User => !!user && !!user.id),
          map((user: User) => user.id),
          distinctUntilChanged(),
          switchMap((studentId) =>
            combineLatest([
              this.store.select(selectStudentDashboardLoaded),
              this.store.select(selectStudentDashboardLoading),
              this.store.select(selectLatestEnrolmentLoaded),
              this.store.select(selectLatestEnrolmentLoading),
            ]).pipe(
              filter(
                ([
                  summaryLoaded,
                  summaryLoading,
                  enrolmentLoaded,
                  enrolmentLoading,
                ]) =>
                  (!summaryLoaded && !summaryLoading) ||
                  (!enrolmentLoaded && !enrolmentLoading)
              ),
              take(1),
              tap(
                ([
                  summaryLoaded,
                  summaryLoading,
                  enrolmentLoaded,
                  enrolmentLoading,
                ]) => {
                  if (!summaryLoaded && !summaryLoading) {
                    this.store.dispatch(
                      studentDashboardActions.fetchStudentDashboardSummary({
                        studentNumber: studentId,
                      })
                    );
                  }
                  if (!enrolmentLoaded && !enrolmentLoading) {
                    this.store.dispatch(
                      currentEnrolementActions.fetchLatestEnrolmentWithStatus({
                        studentNumber: studentId,
                      })
                    );
                  }
                }
              )
            )
          )
        )
        .subscribe()
    );
  }

  private loadContinuousAssessmentAnalytics(studentNumber: string) {
    this.caLoading = true;
    this.caService.getStudentAnalytics(studentNumber).subscribe({
      next: (analytics) => {
        this.caAnalytics = analytics;
        this.caLoading = false;
      },
      error: () => {
        this.caLoading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
