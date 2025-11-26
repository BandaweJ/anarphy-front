import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ParentsModel } from '../models/parents.model';

@Component({
  selector: 'app-assign-student-dialog',
  templateUrl: './assign-student-dialog.component.html',
  styleUrls: ['./assign-student-dialog.component.css'],
})
export class AssignStudentDialogComponent {
  assignForm = new FormGroup({
    studentNumber: new FormControl('', [Validators.required]),
  });

  constructor(
    private dialogRef: MatDialogRef<AssignStudentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { parent: ParentsModel }
  ) {}

  submit(): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.assignForm.value.studentNumber);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}


