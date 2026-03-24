import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { Observable, Subject, takeUntil } from 'rxjs';
import { TermsModel } from 'src/app/enrolment/models/terms.model';
import {
  addTermAction,
  editTermAction,
} from 'src/app/enrolment/store/enrolment.actions';
import { selectEnrolErrorMsg } from 'src/app/enrolment/store/enrolment.selectors';

@Component({
  selector: 'app-add-edit-term',
  templateUrl: './add-edit-term.component.html',
  styleUrls: ['./add-edit-term.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddEditTermComponent implements OnInit, OnDestroy {
  addTermForm!: FormGroup;
  errorMsg$!: Observable<string>;
  isLoading = false;
  isEditMode = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    public title: Title,
    private store: Store,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private dialogRef: MatDialogRef<AddEditTermComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: TermsModel
  ) {
    this.isEditMode = !!data;
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupObservables();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.addTermForm = new FormGroup({
      num: new FormControl('', [
        Validators.required,
        Validators.min(1),
        Validators.max(6)
      ]),
      year: new FormControl('', [
        Validators.required,
        Validators.min(2000),
        Validators.max(2100)
      ]),
      type: new FormControl('regular', [Validators.required]),
      startDate: new FormControl('', [Validators.required]),
      endDate: new FormControl('', [Validators.required]),
    }, { validators: this.dateRangeValidator });

    if (this.data) {
      this.addTermForm.patchValue({
        num: this.data.num,
        year: this.data.year,
        type: this.data.type ?? 'regular',
        startDate: new Date(this.data.startDate),
        endDate: new Date(this.data.endDate)
      });
    }

    this.cdr.markForCheck();
  }

  private setupObservables(): void {
    this.errorMsg$ = this.store.select(selectEnrolErrorMsg);
    
    this.errorMsg$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(errorMsg => {
      if (errorMsg) {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private dateRangeValidator(control: any) {
    const form = control as FormGroup;
    const startDate = form.get('startDate')?.value;
    const endDate = form.get('endDate')?.value;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start >= end) {
        return { dateRange: true };
      }
    }
    
    return null;
  }

  get num() {
    return this.addTermForm.get('num');
  }

  get year() {
    return this.addTermForm.get('year');
  }

  get startDate() {
    return this.addTermForm.get('startDate');
  }

  get endDate() {
    return this.addTermForm.get('endDate');
  }

  addTerm(): void {
    if (this.addTermForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.isLoading = true;
    this.cdr.markForCheck();

    const formValue = this.addTermForm.value;
    const term: TermsModel = {
      num: Number(formValue.num),
      year: Number(formValue.year),
      type: formValue.type,
      startDate: formValue.startDate,
      endDate: formValue.endDate
    };

    if (this.isEditMode) {
      this.store.dispatch(editTermAction({ term }));
      this.snackBar.open('Term updated successfully', 'Close', {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'right'
      });
    } else {
      this.store.dispatch(addTermAction({ term }));
      this.snackBar.open('Term added successfully', 'Close', {
        duration: 3000,
        verticalPosition: 'top',
        horizontalPosition: 'right'
      });
    }

    this.dialogRef.close(true);
  }

  private markFormGroupTouched(): void {
    Object.keys(this.addTermForm.controls).forEach(key => {
      const control = this.addTermForm.get(key);
      control?.markAsTouched();
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  getFormErrorMessage(controlName: string): string {
    const control = this.addTermForm.get(controlName);
    if (control?.hasError('required')) {
      return `${controlName.charAt(0).toUpperCase() + controlName.slice(1)} is required`;
    }
    if (control?.hasError('min')) {
      return `${controlName.charAt(0).toUpperCase() + controlName.slice(1)} must be at least ${control.errors?.['min'].min}`;
    }
    if (control?.hasError('max')) {
      return `${controlName.charAt(0).toUpperCase() + controlName.slice(1)} must not exceed ${control.errors?.['max'].max}`;
    }
    return '';
  }

  getDateRangeErrorMessage(): string {
    if (this.addTermForm.hasError('dateRange')) {
      return 'End date must be after start date';
    }
    return '';
  }

  getAvailableYears(): number[] {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 2; i++) {
      years.push(i);
    }
    return years;
  }
}
