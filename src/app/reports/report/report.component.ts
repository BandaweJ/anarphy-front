import { Component, Input, OnInit } from '@angular/core'; // No OnDestroy needed here if no subscriptions are kept
import { ReportsModel } from '../models/reports.model';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import {
  downloadReportActions,
  saveHeadCommentActions,
  saveFormTeacherCommentActions,
} from '../store/reports.actions';

import { HeadCommentModel, FormTeacherCommentModel } from '../models/comment.model';
import { selectUser } from 'src/app/auth/store/auth.selectors';

import { selectIsLoading } from '../store/reports.selectors';
import { ExamType } from 'src/app/marks/models/examtype.enum';
import { Subscription, combineLatest, Subject } from 'rxjs'; // Import Subscription and Subject
import { map, filter, takeUntil } from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';
import { RoleAccessService } from 'src/app/services/role-access.service';
import { ROLES } from 'src/app/registration/models/roles.enum';

// pdfMake.vfs = pdfFonts.pdfMake.vfs; // Commented out as per original

@Component({
  selector: 'app-report',
  templateUrl: './report.component.html',
  styleUrls: ['./report.component.css'],
})
export class ReportComponent implements OnInit {
  @Input()
  report!: ReportsModel;
  editState = false;
  editFormTeacherCommentState = false;
  role = ''; // Initialize role
  isLoading$ = this.store.select(selectIsLoading);
  studentNumber = '';
  
  // Permission-based access observables
  canDownloadReport$ = this.roleAccess.canDownloadReport$();
  canEditComment$ = this.roleAccess.canEditReportComment$();
  isStudent$ = this.roleAccess.getCurrentRole$().pipe(
    map(role => this.roleAccess.hasRole(ROLES.student, role))
  );
  
  // Combined observables for template use
  canEditCommentAndNotStudent$ = combineLatest([
    this.isStudent$,
    this.canEditComment$
  ]).pipe(
    map(([isStudent, canEdit]) => !isStudent && canEdit)
  );

  private userSubscription: Subscription | undefined; // Declare subscription
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private roleAccess: RoleAccessService,
    private actions$: Actions
  ) {}

  commentForm!: FormGroup;
  formTeacherCommentForm!: FormGroup;

  ngOnInit(): void {
    this.commentForm = new FormGroup({
      comment: new FormControl(this.report.report.headComment, [
        Validators.required,
      ]),
    });
    this.formTeacherCommentForm = new FormGroup({
      comment: new FormControl(this.report.report.classTrComment, [
        Validators.required,
      ]),
    });
    this.studentNumber = this.report.report.studentNumber;

    this.userSubscription = this.store.select(selectUser).subscribe((user) => {
      if (user) {
        this.role = user.role;
      }
    });

    // Subscribe to comment save success actions to update local report
    this.actions$
      .pipe(
        ofType(
          saveHeadCommentActions.saveHeadCommentSuccess,
          saveFormTeacherCommentActions.saveFormTeacherCommentSuccess
        ),
        filter((action): action is typeof action & { report: ReportsModel } => {
          return 'report' in action && 
                 action.report !== null && 
                 action.report !== undefined &&
                 action.report.studentNumber === this.report.studentNumber;
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((action) => {
        const report = action.report;
        this.report = report;
        // Update form values if needed
        if (action.type === saveHeadCommentActions.saveHeadCommentSuccess.type) {
          this.commentForm.get('comment')?.setValue(report.report.headComment);
        } else if (action.type === saveFormTeacherCommentActions.saveFormTeacherCommentSuccess.type) {
          this.formTeacherCommentForm.get('comment')?.setValue(report.report.classTrComment);
        }
      });
  }

  // Add ngOnDestroy to unsubscribe if the component might not be destroyed and recreated quickly
  ngOnDestroy(): void {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  get comment() {
    return this.commentForm.get('comment');
  }

  get formTeacherComment() {
    return this.formTeacherCommentForm.get('comment');
  }

  saveComment() {
    if (this.comment?.valid) {
      // Check for validity of the form control
      const rep = this.report;
      const comm: string = this.comment.value;

      const comment: HeadCommentModel = {
        comment: comm,
        report: rep,
      };

      this.store.dispatch(saveHeadCommentActions.saveHeadComment({ comment }));
      this.toggleEditState(); // Toggle state after dispatching
    }
  }

  saveFormTeacherComment() {
    if (this.formTeacherComment?.valid) {
      const rep = this.report;
      const comm: string = this.formTeacherComment.value;

      const comment: FormTeacherCommentModel = {
        comment: comm,
        report: rep,
      };

      this.store.dispatch(saveFormTeacherCommentActions.saveFormTeacherComment({ comment }));
      this.toggleFormTeacherCommentEditState();
    }
  }

  toggleEditState() {
    this.editState = !this.editState;
    // When toggling to edit state, ensure the form control value is updated
    // with the latest report comment, in case it was updated by another user or process.
    if (this.editState) {
      this.commentForm.get('comment')?.setValue(this.report.report.headComment);
    }
  }

  toggleFormTeacherCommentEditState() {
    this.editFormTeacherCommentState = !this.editFormTeacherCommentState;
    if (this.editFormTeacherCommentState) {
      this.formTeacherCommentForm.get('comment')?.setValue(this.report.report.classTrComment);
    }
  }

  download() {
    const { report } = this.report; // Destructure for cleaner access
    const {
      className: name,
      termNumber: num,
      termYear: year,
      examType: examType,
      studentNumber,
    } = report;

    if (examType) {
      // Check if examType exists before dispatching
      this.store.dispatch(
        downloadReportActions.downloadReport({
          name,
          num,
          year,
          // Re-evaluate if you need `examType` if you already have it from `report.report.examType`
          // If the action expects `ExamType`, ensure 'examType' from 'report.report' is that type.
          examType: examType, // Explicit cast if necessary
          studentNumber: this.report.studentNumber, // Use this.report.studentNumber from the top level
        })
      );
    } else {
      console.warn('Cannot download report: ExamType is missing.');
    }
  }
}
