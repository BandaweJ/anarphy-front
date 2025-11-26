import { Component, Inject } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ParentsModel } from '../models/parents.model';

@Component({
  selector: 'app-add-parent-dialog',
  templateUrl: './add-parent-dialog.component.html',
  styleUrls: ['./add-parent-dialog.component.css'],
})
export class AddParentDialogComponent {
  parentForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    surname: new FormControl('', [Validators.required]),
    title: new FormControl('Mr', [Validators.required]),
    sex: new FormControl('Male', [Validators.required]),
    idnumber: new FormControl(''),
    cell: new FormControl(''),
    address: new FormControl(''),
  });

  constructor(
    private dialogRef: MatDialogRef<AddParentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { parent?: ParentsModel } | null
  ) {
    if (data?.parent) {
      this.parentForm.patchValue(data.parent);
    }
  }

  submit(): void {
    if (this.parentForm.invalid) {
      this.parentForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.parentForm.value as ParentsModel);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}


