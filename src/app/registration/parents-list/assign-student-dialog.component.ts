import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ParentsModel } from '../models/parents.model';
import { StudentsModel } from '../models/students.model';
import { StudentsService } from '../services/students.service';

@Component({
  selector: 'app-assign-student-dialog',
  templateUrl: './assign-student-dialog.component.html',
  styleUrls: ['./assign-student-dialog.component.css'],
})
export class AssignStudentDialogComponent implements OnInit, OnDestroy {
  students: StudentsModel[] = [];
  filteredStudents: StudentsModel[] = [];
  searchControl = new FormControl('');
  private destroy$ = new Subject<void>();

  constructor(
    private dialogRef: MatDialogRef<AssignStudentDialogComponent>,
    private studentsService: StudentsService,
    @Inject(MAT_DIALOG_DATA) public data: { parent: ParentsModel }
  ) {}

  ngOnInit(): void {
    this.studentsService
      .getAllStudents()
      .pipe(takeUntil(this.destroy$))
      .subscribe((students) => {
        this.students = students || [];
        this.filteredStudents = this.students;
      });

    this.searchControl.valueChanges
      .pipe(
        debounceTime(200),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((value) => {
        const term = (value || '').toLowerCase();
        this.filteredStudents = this.students.filter((s) => {
          return (
            s.studentNumber.toLowerCase().includes(term) ||
            s.name.toLowerCase().includes(term) ||
            s.surname.toLowerCase().includes(term) ||
            (s.cell || '').toLowerCase().includes(term)
          );
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  chooseStudent(student: StudentsModel): void {
    this.dialogRef.close(student.studentNumber);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}


