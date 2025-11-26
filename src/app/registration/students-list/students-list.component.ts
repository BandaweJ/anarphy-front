import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { Observable, Subject, takeUntil, debounceTime, distinctUntilChanged, switchMap, startWith, combineLatest } from 'rxjs';
import { StudentsModel } from '../models/students.model';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import {
  selectIsLoading,
  selectRegErrorMsg,
  selectStudents,
} from '../store/registration.selectors';
import { AddEditStudentComponent } from './add-edit-student/add-edit-student.component';
import { StudentIdCardComponent } from './student-id-card/student-id-card.component';
import {
  deleteStudentAction,
  fetchStudents,
} from '../store/registration.actions';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-students-list',
  templateUrl: './students-list.component.html',
  styleUrls: ['./students-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentsListComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  students$!: Observable<StudentsModel[]>;
  errorMsg$!: Observable<string>;
  isLoading$ = this.store.select(selectIsLoading);

  // Form for filtering
  filterForm = new FormGroup({
    search: new FormControl(''),
    gender: new FormControl('')
  });

  displayedColumns: string[] = [
    'studentNumber',
    'surname',
    'name',
    'gender',
    'cell',
    'action',
  ];

  dataSource = new MatTableDataSource<StudentsModel>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private store: Store,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public title: Title,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.store.dispatch(fetchStudents());
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupObservables();
    this.setupSearch();
    this.setupFiltering();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.students$ = this.store.select(selectStudents);
    this.errorMsg$ = this.store.select(selectRegErrorMsg);
  }

  private setupObservables(): void {
    this.students$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((students) => {
      this.dataSource.data = students;
      this.cdr.markForCheck();
    });
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.dataSource.filter = searchTerm.trim().toLowerCase();
      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    });
  }

  private setupFiltering(): void {
    combineLatest([
      this.filterForm.get('search')!.valueChanges.pipe(startWith('')),
      this.filterForm.get('gender')!.valueChanges.pipe(startWith(''))
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([search, gender]) => {
      this.dataSource.filterPredicate = (data: StudentsModel, filter: string) => {
        const normalizedSearch = (search || '').toLowerCase();
        const normalizedGender = gender || '';

        const searchMatch =
          !normalizedSearch ||
          data.name.toLowerCase().includes(normalizedSearch) ||
          data.surname.toLowerCase().includes(normalizedSearch) ||
          data.studentNumber.toLowerCase().includes(normalizedSearch) ||
          (data.cell || '').toLowerCase().includes(normalizedSearch) ||
          (data.email || '').toLowerCase().includes(normalizedSearch);
        
        const genderMatch = !normalizedGender || data.gender === normalizedGender;
        
        return searchMatch && genderMatch;
      };
      
      this.dataSource.filter = 'trigger';
      if (this.dataSource.paginator) {
        this.dataSource.paginator.firstPage();
      }
    });
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  openAddEditStudentDialog(): void {
    const dialogRef = this.dialog.open(AddEditStudentComponent, {
      width: '90vw',
      maxWidth: '800px',
      disableClose: true
    });
    
    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result) {
        this.snackBar.open('Student saved successfully!', 'Close', {
          duration: 3000,
          verticalPosition: 'top'
        });
      }
    });
  }

  deleteStudent(student: StudentsModel): void {
    if (confirm(`Are you sure you want to delete ${student.name} ${student.surname}?`)) {
      this.store.dispatch(deleteStudentAction({ studentNumber: student.studentNumber }));
      this.snackBar.open('Student deleted successfully!', 'Close', {
        duration: 3000,
        verticalPosition: 'top'
      });
    }
  }

  openEditStudentDialog(data: StudentsModel): void {
    const dialogRef = this.dialog.open(AddEditStudentComponent, { 
      data,
      width: '90vw',
      maxWidth: '800px',
      disableClose: true
    });
    
    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe(result => {
      if (result) {
        this.snackBar.open('Student updated successfully!', 'Close', {
          duration: 3000,
          verticalPosition: 'top'
        });
      }
    });
  }

  openEditStudentView(student: StudentsModel): void {
    this.router.navigate(['/student-view', student.studentNumber]);
  }

  trackByStudentId(index: number, student: StudentsModel): string {
    return student.studentNumber;
  }

  generateIDCard(student: StudentsModel): void {
    const dialogRef = this.dialog.open(StudentIdCardComponent, {
      data: student,
      width: '90vw',
      maxWidth: '800px',
      disableClose: false
    });

    dialogRef.afterClosed().pipe(
      takeUntil(this.destroy$)
    ).subscribe();
  }
}
