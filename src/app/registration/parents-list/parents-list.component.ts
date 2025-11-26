import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import {
  Observable,
  Subject,
  debounceTime,
  distinctUntilChanged,
  takeUntil,
} from 'rxjs';
import { ParentsModel } from '../models/parents.model';
import { StudentsModel } from '../models/students.model';
import { ParentsService } from '../services/parents.service';
import {
  selectIsLoading,
  selectRegErrorMsg,
} from '../store/registration.selectors';
import { Theme, ThemeService } from 'src/app/services/theme.service';
import { AddParentDialogComponent } from './add-parent-dialog.component';
import { AssignStudentDialogComponent } from './assign-student-dialog.component';

@Component({
  selector: 'app-parents-list',
  templateUrl: './parents-list.component.html',
  styleUrls: ['./parents-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentsListComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  parents: ParentsModel[] = [];
  childrenForSelectedParent: StudentsModel[] = [];
  selectedParent: ParentsModel | null = null;

  isLoading$ = this.store.select(selectIsLoading);
  errorMsg$!: Observable<string>;

  displayedColumns: string[] = [
    'email',
    'surname',
    'title',
    'cell',
    'address',
    'actions',
  ];

  dataSource = new MatTableDataSource<ParentsModel>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  currentTheme: Theme = 'light';

  constructor(
    private parentsService: ParentsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private store: Store,
    public title: Title,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.title.setTitle('Manage Parents');
    this.errorMsg$ = this.store.select(selectRegErrorMsg);

    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme) => {
        this.currentTheme = theme;
        this.cdr.markForCheck();
      });

    this.loadParents();
    this.setupSearch();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadParents(): void {
    this.parentsService
      .getParents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (parents) => {
          this.parents = parents || [];
          this.dataSource.data = this.parents;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to load parents', error);
          this.snackBar.open('Failed to load parents', 'Close', {
            duration: 3000,
          });
        },
      });
  }

  private setupSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((searchTerm) => {
        this.dataSource.filterPredicate = (
          data: ParentsModel,
          filter: string
        ) => {
          const term = filter.toLowerCase();
          return (
            data.email.toLowerCase().includes(term) ||
            data.surname.toLowerCase().includes(term) ||
            (data.cell || '').toLowerCase().includes(term)
          );
        };

        this.dataSource.filter = searchTerm.trim().toLowerCase();

        if (this.dataSource.paginator) {
          this.dataSource.paginator.firstPage();
        }
      });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.searchSubject.next(filterValue);
  }

  openAddParentDialog(): void {
    const dialogRef = this.dialog.open(AddParentDialogComponent, {
      width: '600px',
      disableClose: true,
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: ParentsModel | null) => {
        if (!result) {
          return;
        }
        this.parentsService
          .createParent(result)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (created) => {
              this.snackBar.open('Parent created successfully', 'Close', {
                duration: 3000,
                verticalPosition: 'top',
              });
              this.parents = [created, ...this.parents];
              this.dataSource.data = this.parents;
              this.cdr.markForCheck();
            },
            error: (error) => {
              console.error('Failed to create parent', error);
              this.snackBar.open(
                error?.error?.message || 'Failed to create parent',
                'Close',
                {
                  duration: 4000,
                  verticalPosition: 'top',
                }
              );
            },
          });
      });
  }

  deleteParent(parent: ParentsModel): void {
    if (
      !confirm(
        `Are you sure you want to delete parent ${parent.surname} (${parent.email})?`
      )
    ) {
      return;
    }

    this.parentsService
      .deleteParent(parent.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('Parent deleted successfully', 'Close', {
            duration: 3000,
            verticalPosition: 'top',
          });
          this.parents = this.parents.filter(
            (p) => p.email !== parent.email
          );
          this.dataSource.data = this.parents;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to delete parent', error);
          this.snackBar.open(
            error?.error?.message || 'Failed to delete parent',
            'Close',
            {
              duration: 4000,
              verticalPosition: 'top',
            }
          );
        },
      });
  }

  loadChildren(parent: ParentsModel): void {
    this.selectedParent = parent;
    this.parentsService
      .getParentStudents(parent.email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (children) => {
          this.childrenForSelectedParent = children || [];
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Failed to load children for parent', error);
          this.snackBar.open(
            'Failed to load linked students for parent',
            'Close',
            {
              duration: 3000,
              verticalPosition: 'top',
            }
          );
        },
      });
  }

  openAssignStudentDialog(parent: ParentsModel): void {
    const dialogRef = this.dialog.open(AssignStudentDialogComponent, {
      width: '400px',
      disableClose: true,
      data: { parent },
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((studentNumber: string | null) => {
        if (!studentNumber) {
          return;
        }

        this.parentsService
          .assignStudentToParent(parent.email, studentNumber)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.snackBar.open('Student assigned to parent', 'Close', {
                duration: 3000,
                verticalPosition: 'top',
              });
              this.loadChildren(parent);
            },
            error: (error) => {
              console.error('Failed to assign student to parent', error);
              this.snackBar.open(
                error?.error?.message || 'Failed to assign student',
                'Close',
                {
                  duration: 4000,
                  verticalPosition: 'top',
                }
              );
            },
          });
      });
  }

  trackByParentEmail(index: number, parent: ParentsModel): string {
    return parent.email;
  }
}

