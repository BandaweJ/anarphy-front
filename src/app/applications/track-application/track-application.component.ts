import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApplicationsService } from '../services/applications.service';
import {
  ApplicationModel,
  ApplicationStatus,
} from '../models/application.model';
import { Title } from '@angular/platform-browser';
import { ThemeService, Theme } from 'src/app/services/theme.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-track-application',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './track-application.component.html',
  styleUrls: ['./track-application.component.scss'],
})
export class TrackApplicationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  currentTheme: Theme = 'light';
  trackForm!: FormGroup;
  isLoading = false;
  application: ApplicationModel | null = null;
  ApplicationStatus = ApplicationStatus;

  constructor(
    private applicationsService: ApplicationsService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private title: Title,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Track Application - School Application');
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme) => {
        this.currentTheme = theme;
      });

    this.trackForm = new FormGroup({
      applicationId: new FormControl('', [
        Validators.required,
        Validators.minLength(10),
      ]),
    });

    // Check if application ID is in query params
    this.route.queryParams.subscribe((params) => {
      if (params['id']) {
        this.trackForm.patchValue({ applicationId: params['id'] });
        this.trackApplication();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackApplication(): void {
    if (this.trackForm.invalid || this.isLoading) {
      return;
    }

    this.isLoading = true;
    const applicationId = this.trackForm.get('applicationId')?.value;

    this.applicationsService.trackApplication(applicationId).subscribe({
      next: (application) => {
        this.application = application;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.application = null;
        const errorMessage =
          error.error?.message ||
          'Application not found. Please check your reference number.';
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  getStatusColor(status: ApplicationStatus | string): string {
    // Normalize status to handle both enum and string formats
    const statusValue = status?.toString() || '';
    const statusStr = statusValue.toLowerCase().replace(/\s+/g, '_');
    
    // Check against enum values directly
    if (status === ApplicationStatus.PENDING || statusStr === 'pending') {
      return 'accent'; // Orange/Yellow for pending
    } else if (status === ApplicationStatus.ON_HOLD || statusStr === 'on_hold' || statusStr === 'onhold') {
      return 'accent'; // Orange/Yellow for on hold
    } else if (status === ApplicationStatus.ACCEPTED || statusStr === 'accepted') {
      return 'primary'; // Blue/Green for accepted
    } else if (status === ApplicationStatus.DECLINED || statusStr === 'declined') {
      return 'warn'; // Red for declined
    }
    
    // Fallback: return empty string (default chip color)
    return '';
  }

  getStatusLabel(status: ApplicationStatus): string {
    return status
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}



