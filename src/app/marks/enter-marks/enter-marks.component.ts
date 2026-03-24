import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  OnDestroy,
} from '@angular/core';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { FormControl, FormGroup, Validators, FormArray } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject, combineLatest, merge } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import {
  map,
  startWith,
  takeUntil,
  debounceTime,
  distinctUntilChanged,
} from 'rxjs/operators';
import { ClassesModel } from '../../enrolment/models/classes.model';
import { TermsModel } from '../../enrolment/models/terms.model';
import {
  fetchClasses,
  fetchTerms,
} from '../../enrolment/store/enrolment.actions';
import { MatTableDataSource } from '@angular/material/table';
import {
  selectClasses,
  selectTerms,
} from '../../enrolment/store/enrolment.selectors';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MarksModel } from '../models/marks.model';
import { SubjectsModel } from '../models/subjects.model';
import {
  fetchSubjectMarksInClass,
  fetchSubjects,
  saveMarkAction,
  deleteMarkActions,
} from '../store/marks.actions';
import { selectMarks, selectSubjects, isLoading } from '../store/marks.selectors';
import { Title } from '@angular/platform-browser';
import { ExamType } from '../models/examtype.enum';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MarksService } from '../services/marks.service';
// ConfirmDialogComponent will be lazy loaded

interface MarkFormGroup {
  mark: FormControl<number | null>;
  termMark: FormControl<number | null>;
  comment: FormControl<string | null>;
}

@Component({
  selector: 'app-enter-marks',
  templateUrl: './enter-marks.component.html',
  styleUrls: ['./enter-marks.component.css'],
})
export class EnterMarksComponent implements OnInit, AfterViewInit, OnDestroy {
  classes$!: Observable<ClassesModel[]>;
  terms$!: Observable<TermsModel[]>;
  subjects$!: Observable<SubjectsModel[]>;
  isLoading$!: Observable<boolean>;
  private errorMsg$!: Observable<string>;

  enrolForm!: FormGroup;
  marksFormArray: FormArray<FormGroup<MarkFormGroup>> = new FormArray<
    FormGroup<MarkFormGroup>
  >([]);
  public dataSource = new MatTableDataSource<MarksModel>();

  value = 0;
  maxValue = 0;
  savingMarks = new Set<number>(); // Track which marks are being saved
  generatingAiComments = new Set<number>();
  aiCommentOptions = new Map<number, string[]>();
  /** When last fetch ran for a row, keyed by mark (so changing mark refetches). */
  private lastAiFetchKeyByRow = new Map<number, string>();
  private commentAiRefresh$ = new Subject<void>();
  bulkGeneratingAi = false;

  examtype: ExamType[] = [ExamType.midterm, ExamType.endofterm];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  /** One trigger per comment row — used to open the autocomplete dropdown after AI loads. */
  @ViewChildren(MatAutocompleteTrigger)
  commentAutocompleteTriggers!: QueryList<MatAutocompleteTrigger>;

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    public title: Title,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private marksService: MarksService,
    private cdr: ChangeDetectorRef
  ) {
    this.store.dispatch(fetchClasses());
    this.store.dispatch(fetchTerms());
    this.store.dispatch(fetchSubjects());

    this.dataSource.filterPredicate = this.customFilterPredicate;
  }

  customFilterPredicate = (data: MarksModel, filter: string): boolean => {
    const searchString = filter.trim().toLowerCase();

    // Explicitly extract and combine only the desired properties, handling potential null/undefined
    const studentName = data.student?.name?.toLowerCase() || '';
    const studentSurname = data.student?.surname?.toLowerCase() || '';
    const studentNumber = data.student?.studentNumber?.toLowerCase() || ''; // StudentNumber is already a string

    const combinedString = `${studentName} ${studentSurname} ${studentNumber}`;

    return combinedString.includes(searchString);
  };

  ngOnInit(): void {
    this.classes$ = this.store.select(selectClasses);
    this.terms$ = this.store.select(selectTerms);
    this.subjects$ = this.store.select(selectSubjects);
    this.isLoading$ = this.store.select(isLoading);

    this.store
      .select(selectMarks)
      .pipe(takeUntil(this.destroy$))
      .subscribe((marks) => {
        this.dataSource.data = marks;
        this.maxValue = marks.length;
        this.updateMarksFormArray(marks);
        this.updateProgressBar();
      });

    this.enrolForm = new FormGroup({
      class: new FormControl('', [Validators.required]),
      term: new FormControl('', [Validators.required]),
      subject: new FormControl('', Validators.required),
      examType: new FormControl('', Validators.required),
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  private updateMarksFormArray(marks: MarksModel[]): void {
    this.marksFormArray.clear();
    this.aiCommentOptions.clear();
    this.lastAiFetchKeyByRow.clear();

    marks.forEach((mark) => {
      const markControl = new FormControl<number | null>(mark.mark || null, [
        Validators.required,
        Validators.min(0),
        Validators.max(100),
      ]);
      const commentControl = new FormControl<string | null>(
        mark.comment || null,
        Validators.required
      );
      const termMarkControl = new FormControl<number | null>(mark.termMark ?? null, [
        Validators.min(0),
        Validators.max(100),
      ]);

      const markFormGroup = new FormGroup<MarkFormGroup>({
        mark: markControl,
        termMark: termMarkControl,
        comment: commentControl,
      });

      this.marksFormArray.push(markFormGroup);

      combineLatest([
        markControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged()
        ),
        commentControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged()
        ),
        termMarkControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged()
        ),
      ])
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.updateProgressBar();
        });
    });
  }

  private updateProgressBar(): void {
    let completedCount = 0;
    this.dataSource.data.forEach((markModel, index) => {
      const formGroup = this.marksFormArray.at(
        index
      ) as FormGroup<MarkFormGroup>;
      if (
        formGroup &&
        formGroup.controls.mark.valid &&
        formGroup.controls.comment.valid
      ) {
        completedCount++;
      }
    });
    this.value = completedCount;
  }

  /**
   * Autocomplete options: AI suggestions only (no hardcoded list).
   * Merge with commentAiRefresh$ so the list updates when a fetch completes.
   */
  getFilteredCommentOptions(index: number): Observable<string[]> {
    const commentControl = this.getCommentControl(index);
    return merge(
      commentControl.valueChanges,
      this.commentAiRefresh$
    ).pipe(
      startWith(commentControl.value),
      map(() => {
        const options = this.getCommentOptionsForRow(index);
        const raw = commentControl.value ?? '';
        const filterValue = String(raw).toLowerCase().trim();
        if (!filterValue) {
          return options;
        }
        return options.filter((option) =>
          option.toLowerCase().includes(filterValue)
        );
      }),
      takeUntil(this.destroy$)
    );
  }

  getCommentOptionsForRow(index: number): string[] {
    return this.aiCommentOptions.get(index) || [];
  }

  trackByCommentOption(_index: number, option: string): string {
    return option;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  get classControl() {
    return this.enrolForm.get('class');
  }

  get termControl() {
    return this.enrolForm.get('term');
  }

  get subjectControl() {
    return this.enrolForm.get('subject');
  }

  get examTypeControl() {
    return this.enrolForm.get('examType');
  }

  displayedColumns = [
    'studentNumber',
    'surname',
    'name',
    'gender',
    'markComment',
    'action',
  ];

  fetchClassList() {
    if (this.enrolForm.invalid) {
      this.snackBar.open(
        'Please select Term, Exam Type, Class, and Subject to fetch data.',
        'Close',
        { duration: 3000 }
      );
      this.enrolForm.markAllAsTouched();
      return;
    }

    const name = this.classControl?.value;
    const term: TermsModel = this.termControl?.value;
    const subject: SubjectsModel = this.subjectControl?.value;

    const num = term.num;
    const year = term.year;
    const subjectCode = subject.code;
    const examType = this.examTypeControl?.value;
    const termId = term.id;

    this.store.dispatch(
      fetchSubjectMarksInClass({ name, num, year, subjectCode, examType, termId })
    );
  }

  getMarkFormGroup(index: number): FormGroup<MarkFormGroup> {
    return this.marksFormArray.at(index) as FormGroup<MarkFormGroup>;
  }

  getMarkControl(index: number): FormControl<number | null> {
    return this.getMarkFormGroup(index).get('mark') as FormControl<
      number | null
    >;
  }

  getCommentControl(index: number): FormControl<string | null> {
    return this.getMarkFormGroup(index).get('comment') as FormControl<
      string | null
    >;
  }

  getTermMarkControl(index: number): FormControl<number | null> {
    return this.getMarkFormGroup(index).get('termMark') as FormControl<
      number | null
    >;
  }

  /**
   * Mirrors server `resolveToneFromPercentage` (mark / 100 as %).
   * Used only for UI hints; the API still applies tone from the mark.
   */
  getAutoToneLabelForIndex(index: number): string {
    const m = this.getMarkControl(index).value;
    if (m === null || m === undefined) {
      return 'Enter a mark to preview tone.';
    }
    if (m < 0 || m > 100) {
      return 'Invalid mark for tone preview.';
    }
    if (m < 50) {
      return 'Encouraging tone (mark < 50%).';
    }
    if (m < 75) {
      return 'Balanced tone (50–74%).';
    }
    return 'Firm tone (75%+).';
  }

  isGeneratingAi(index: number): boolean {
    return this.generatingAiComments.has(index);
  }

  /** Focus on the comment field loads AI suggestions (quietly unless invalid mark). */
  onCommentFocus(row: MarksModel, index: number): void {
    this.requestAiComments(row, index, { silent: true });
  }

  /** Opens the Material autocomplete overlay so AI options appear as a dropdown. */
  private openCommentAutocompletePanel(rowIndex: number): void {
    this.cdr.detectChanges();
    queueMicrotask(() => {
      const triggers = this.commentAutocompleteTriggers?.toArray();
      const trigger = triggers?.[rowIndex];
      if (trigger) {
        trigger.openPanel();
      }
    });
  }

  /** Manual refresh: always refetches from the API. */
  generateAiComments(markModel: MarksModel, index: number): void {
    this.requestAiComments(markModel, index, { silent: false, force: true });
  }

  private requestAiComments(
    markModel: MarksModel,
    index: number,
    options: { silent?: boolean; force?: boolean } = {}
  ): void {
    const { silent = false, force = false } = options;
    const formGroup = this.getMarkFormGroup(index);
    const mark = formGroup.controls.mark.value;
    if (mark === null || mark === undefined || mark < 0 || mark > 100) {
      if (!silent) {
        this.snackBar.open(
          'Enter a valid mark first (0-100) to generate AI comments.',
          'Close',
          { duration: 2500 }
        );
      }
      return;
    }

    if (this.generatingAiComments.has(index)) {
      return;
    }

    const fetchKey = String(mark);
    if (
      !force &&
      (this.aiCommentOptions.get(index)?.length ?? 0) >= 1 &&
      this.lastAiFetchKeyByRow.get(index) === fetchKey
    ) {
      return;
    }

    const subject = this.subjectControl?.value as SubjectsModel | null;
    const className = this.classControl?.value as string | null;
    const examType = this.examTypeControl?.value as ExamType | null;

    this.generatingAiComments.add(index);
    this.marksService
      .generateCommentOptions({
        mark,
        maxMark: 100,
        subject: subject?.name,
        studentName: `${markModel.student?.name || ''} ${
          markModel.student?.surname || ''
        }`.trim(),
        className: className || undefined,
        examType: examType || undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.aiCommentOptions.set(index, res.comments || []);
          this.lastAiFetchKeyByRow.set(index, fetchKey);
          this.commentAiRefresh$.next();
          if (!res.comments?.length) {
            if (!silent) {
              this.snackBar.open('No AI comments returned for this row.', 'Close', {
                duration: 2000,
              });
            }
            return;
          }
          this.openCommentAutocompletePanel(index);
          if (silent) {
            return;
          }
          const toneHint = res.appliedTone
            ? ` (${res.appliedTone} tone)`
            : '';
          if (res.source === 'fallback') {
            this.snackBar.open(
              `Fallback comments loaded${toneHint}. Pick one from the list or type.`,
              'Close',
              { duration: 2500 }
            );
          } else {
            this.snackBar.open(
              `AI comments ready${toneHint}. Pick one from the list or type.`,
              'Close',
              { duration: 2500 }
            );
          }
        },
        error: () => {
          this.generatingAiComments.delete(index);
          if (!silent) {
            this.snackBar.open(
              'Failed to generate AI comments for this row.',
              'Close',
              { duration: 3000 }
            );
          }
        },
        complete: () => {
          this.generatingAiComments.delete(index);
        },
      });
  }

  async generateAiCommentsForAllRows(): Promise<void> {
    if (!this.dataSource.data.length) {
      this.snackBar.open('No rows loaded yet. Fetch class marks first.', 'Close', {
        duration: 2500,
      });
      return;
    }

    this.bulkGeneratingAi = true;
    let generatedCount = 0;
    let skippedCount = 0;

    for (let index = 0; index < this.dataSource.data.length; index++) {
      const row = this.dataSource.data[index];
      const formGroup = this.getMarkFormGroup(index);
      const mark = formGroup.controls.mark.value;
      if (mark === null || mark === undefined || mark < 0 || mark > 100) {
        skippedCount++;
        continue;
      }

      const subject = this.subjectControl?.value as SubjectsModel | null;
      const className = this.classControl?.value as string | null;
      const examType = this.examTypeControl?.value as ExamType | null;
      this.generatingAiComments.add(index);

      try {
        const res = await firstValueFrom(
          this.marksService.generateCommentOptions({
            mark,
            maxMark: 100,
            subject: subject?.name,
            studentName: `${row.student?.name || ''} ${
              row.student?.surname || ''
            }`.trim(),
            className: className || undefined,
            examType: examType || undefined,
          })
        );
        this.aiCommentOptions.set(index, res.comments || []);
        this.lastAiFetchKeyByRow.set(index, String(mark));
        generatedCount++;
      } catch {
        skippedCount++;
      } finally {
        this.generatingAiComments.delete(index);
      }
    }

    this.commentAiRefresh$.next();
    this.bulkGeneratingAi = false;
    this.snackBar.open(
      `AI suggestions ready for ${generatedCount} row(s). Skipped ${skippedCount} row(s). Tone is set per row from each mark.`,
      'Close',
      { duration: 4000 }
    );
  }

  saveMark(markModel: MarksModel, index: number) {
    const formGroup = this.getMarkFormGroup(index);

    if (formGroup.valid) {
      // Add to saving set
      this.savingMarks.add(index);

      const updatedMark: MarksModel = {
        ...markModel,
        mark: formGroup.value.mark!,
        termMark: formGroup.value.termMark ?? null,
        comment: formGroup.value.comment!,
        examType: this.examTypeControl?.value,
        termId: this.termControl?.value.id,
        year: this.termControl?.value.year,
        num: this.termControl?.value.num,
      };

      this.store.dispatch(saveMarkAction({ mark: updatedMark }));
      
      // Simulate a brief delay to show saving state
      setTimeout(() => {
        this.savingMarks.delete(index);
        this.snackBar.open('Mark saved successfully!', 'Dismiss', {
          duration: 2000,
        });
      }, 500);

      formGroup.markAsPristine();
      formGroup.markAsUntouched();
      formGroup.updateValueAndValidity(); // Ensure validity is re-evaluated after state change
    } else {
      formGroup.markAllAsTouched();
      this.snackBar.open(
        'Please enter a valid mark (0-100) and comment for this row.',
        'Error',
        { duration: 3000 }
      );
      console.log(
        'Invalid form group for mark:',
        formGroup.controls.mark.errors,
        formGroup.controls.comment.errors
      );
    }
  }

  isSavingMark(index: number): boolean {
    return this.savingMarks.has(index);
  }

  async deleteMark(mark: MarksModel): Promise<void> {
    if (!mark.id) {
      this.snackBar.open('Cannot delete: Mark has no ID.', 'Error', {
        duration: 3000,
      });
      return;
    }

    const { ConfirmDialogComponent } = await import('src/app/shared/confirm-dialog/confirm-dialog.component');
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Mark',
        message: `Are you sure you want to delete the mark for ${mark.student?.name} ${mark.student?.surname}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.store.dispatch(deleteMarkActions.deleteMark({ mark }));
        this.snackBar.open('Mark deleted successfully.', 'Dismiss', { 
          duration: 2000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }

  trackByTerm(index: number, term: TermsModel): string {
    return `${term.num}-${term.year}`;
  }

  trackByClass(index: number, clas: ClassesModel): string {
    return clas.id;
  }

  trackBySubject(index: number, subject: SubjectsModel): string {
    return subject.code;
  }

  ngOnDestroy(): void {
    this.commentAiRefresh$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
