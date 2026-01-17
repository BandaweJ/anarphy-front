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
import { ApplicationsService } from '../../services/applications.service';
import {
  ApplicationModel,
  ApplicationStatus,
  UpdateApplicationStatusDto,
} from '../../models/application.model';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './application-detail.component.html',
  styleUrls: ['./application-detail.component.scss'],
})
export class ApplicationDetailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  application: ApplicationModel | null = null;
  statusForm!: FormGroup;
  isLoading = false;
  isUpdating = false;
  isDownloading = false;
  ApplicationStatus = ApplicationStatus;

  constructor(
    private applicationsService: ApplicationsService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.statusForm = new FormGroup({
      status: new FormControl('', [Validators.required]),
      reviewNotes: new FormControl(''),
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadApplication(id);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadApplication(id: string): void {
    this.isLoading = true;
    this.applicationsService.getApplicationById(id).subscribe({
      next: (application) => {
        this.application = application;
        this.statusForm.patchValue({
          status: application.status,
          reviewNotes: application.reviewNotes || '',
        });
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Failed to load application', 'Close', {
          duration: 3000,
        });
        this.router.navigate(['/applications']);
      },
    });
  }

  updateStatus(): void {
    if (this.statusForm.invalid || !this.application || this.isUpdating) {
      return;
    }

    this.isUpdating = true;
    const updateDto: UpdateApplicationStatusDto = {
      status: this.statusForm.get('status')?.value,
      reviewNotes: this.statusForm.get('reviewNotes')?.value || undefined,
    };

    this.applicationsService
      .updateApplicationStatus(this.application.id, updateDto)
      .subscribe({
        next: (updatedApplication) => {
          this.application = updatedApplication;
          this.isUpdating = false;
          this.snackBar.open('Application status updated successfully', 'Close', {
            duration: 3000,
          });
        },
        error: (error) => {
          this.isUpdating = false;
          this.snackBar.open(
            error.error?.message || 'Failed to update application status',
            'Close',
            { duration: 5000 },
          );
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
    // Handle both enum format and string format
    const statusStr = status.toString();
    return statusStr
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  goBack(): void {
    this.router.navigate(['/applications']);
  }

  downloadApplicationPdf(): void {
    if (!this.application || this.isDownloading) {
      return;
    }

    this.isDownloading = true;
    this.applicationsService.downloadApplicationPdf(this.application.id).subscribe({
      next: () => {
        this.isDownloading = false;
        this.snackBar.open('Application PDF downloaded successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (error) => {
        this.isDownloading = false;
        this.snackBar.open(
          error.error?.message || 'Failed to download application PDF',
          'Close',
          { duration: 5000 },
        );
      },
    });
  }
}

