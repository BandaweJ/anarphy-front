import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApplicationsService } from '../services/applications.service';
import { CreateApplicationDto } from '../models/application.model';
import { Title } from '@angular/platform-browser';
import { ThemeService, Theme } from 'src/app/services/theme.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-application-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
  ],
  templateUrl: './application-form.component.html',
  styleUrls: ['./application-form.component.scss'],
})
export class ApplicationFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  currentTheme: Theme = 'light';
  applicationForm!: FormGroup;
  isLoading = false;
  submitted = false;
  applicationId: string | null = null;

  genders = ['Male', 'Female'];
  relationships = ['Father', 'Mother', 'Guardian', 'Other'];

  constructor(
    private applicationsService: ApplicationsService,
    private router: Router,
    private snackBar: MatSnackBar,
    private title: Title,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Apply Now - School Application');
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme) => {
        this.currentTheme = theme;
      });
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.applicationForm = new FormGroup({
      // Personal Information
      name: new FormControl('', [Validators.required, Validators.minLength(2)]),
      surname: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      gender: new FormControl('', [Validators.required]),
      dob: new FormControl(''),
      idnumber: new FormControl(''),
      email: new FormControl('', [Validators.email]),
      cell: new FormControl(''),
      address: new FormControl(''),

      // Academic Information
      prevSchool: new FormControl(''),
      prevSchoolRecords: new FormControl(''),
      desiredClass: new FormControl('', [Validators.required]),

      // Parent/Guardian Information
      parentName: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      parentSurname: new FormControl('', [
        Validators.required,
        Validators.minLength(2),
      ]),
      parentEmail: new FormControl('', [Validators.email]),
      parentCell: new FormControl(''),
      parentRelationship: new FormControl(''),
    });
  }

  onSubmit(): void {
    if (this.applicationForm.invalid || this.isLoading) {
      return;
    }

    this.submitted = true;
    this.isLoading = true;

    const formValue = this.applicationForm.value;
    const applicationDto: CreateApplicationDto = {
      ...formValue,
      dob: formValue.dob
        ? new Date(formValue.dob).toISOString().split('T')[0]
        : undefined,
    };

    this.applicationsService.createApplication(applicationDto).subscribe({
      next: (application) => {
        this.applicationId = application.applicationId;
        this.isLoading = false;
        this.snackBar.open(
          `Application submitted successfully! Your reference number is: ${application.applicationId}`,
          'Close',
          {
            duration: 10000,
            panelClass: ['success-snackbar'],
          },
        );
      },
      error: (error) => {
        this.isLoading = false;
        const errorMessage =
          error.error?.message || 'Failed to submit application. Please try again.';
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  trackApplication(): void {
    if (this.applicationId) {
      this.router.navigate(['/track-application'], {
        queryParams: { id: this.applicationId },
      });
    }
  }
}



