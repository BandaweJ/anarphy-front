import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApplicationsService } from '../../services/applications.service';
import {
  ApplicationModel,
  ApplicationStatus,
} from '../../models/application.model';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-applications-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule,
  ],
  templateUrl: './applications-list.component.html',
  styleUrls: ['./applications-list.component.scss'],
})
export class ApplicationsListComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  applications: ApplicationModel[] = [];
  displayedColumns: string[] = [
    'applicationId',
    'name',
    'desiredClass',
    'status',
    'createdAt',
    'actions',
  ];
  isLoading = false;
  filterForm!: FormGroup;
  ApplicationStatus = ApplicationStatus;

  constructor(
    private applicationsService: ApplicationsService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.filterForm = new FormGroup({
      status: new FormControl(''),
      search: new FormControl(''),
    });

    // Debounce search input
    this.filterForm
      .get('search')
      ?.valueChanges.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
        this.loadApplications();
      });

    this.filterForm
      .get('status')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadApplications();
      });

    this.loadApplications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadApplications(): void {
    this.isLoading = true;
    const status = this.filterForm.get('status')?.value || undefined;
    const search = this.filterForm.get('search')?.value || undefined;

    this.applicationsService.getAllApplications(status, search).subscribe({
      next: (applications) => {
        this.applications = applications;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open(
          'Failed to load applications',
          'Close',
          { duration: 3000 },
        );
      },
    });
  }

  viewApplication(application: ApplicationModel): void {
    this.router.navigate(['/applications', application.id]);
  }

  getStatusColor(status: ApplicationStatus | string): string {
    if (!status) return '';
    
    // Normalize status to handle both enum and string formats
    const statusValue = String(status);
    const statusStr = statusValue.toLowerCase().replace(/\s+/g, '_');
    
    // Debug logging (remove after testing)
    console.log('Status color check:', { status, statusValue, statusStr });
    
    // Check against enum values and normalized strings
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
    console.warn('Unknown status:', status);
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
}



