import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FeesModel } from '../../models/fees.model';
import { FeeSelection } from '../../models/group-invoice.model';
import { FeesNames } from '../../enums/fees-names.enum';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-fee-selection',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    CurrencyPipe,
  ],
  templateUrl: './fee-selection.component.html',
  styleUrls: ['./fee-selection.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeeSelectionComponent implements OnInit, OnDestroy, OnChanges {
  @Input() fees: FeesModel[] | null = [];
  @Input() selectedFees: FeeSelection[] = [];
  @Input() numberOfStudents: number = 0; // Number of students selected for group invoice
  @Output() feesSelected = new EventEmitter<FeeSelection[]>();

  feeForm!: FormGroup;
  
  // Categorized fees
  newStudentFees: FeesModel[] = [];
  tuitionFees: FeesModel[] = [];
  scienceFees: FeesModel[] = [];
  optionalServiceFees: FeesModel[] = [];
  uniformFees: FeesModel[] = [];
  developmentFee: FeesModel | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.feeForm = this.fb.group({});
  }

  ngOnInit(): void {
    if (this.fees) {
      this.organizeFeesByCategory(this.fees);
      this.initializeForm();
      this.setupFormListeners();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(): void {
    if (this.fees) {
      this.organizeFeesByCategory(this.fees);
      this.initializeForm();
      this.setupFormListeners();
      this.cdr.markForCheck();
    }
  }

  private organizeFeesByCategory(fees: FeesModel[]): void {
    this.newStudentFees = [];
    this.tuitionFees = [];
    this.scienceFees = [];
    this.optionalServiceFees = [];
    this.uniformFees = [];
    this.developmentFee = null;

    fees.forEach(fee => {
      switch (fee.name) {
        case FeesNames.oLevelApplicationFee:
        case FeesNames.aLevelApplicationFee:
        case FeesNames.admissionFee:
          this.newStudentFees.push(fee);
          break;

        case FeesNames.oLevelTuitionDay:
        case FeesNames.oLevelTuitionBoarder:
        case FeesNames.aLevelTuitionDay:
        case FeesNames.aLevelTuitionBoarder:
          this.tuitionFees.push(fee);
          break;

        case FeesNames.oLevelScienceFee:
        case FeesNames.alevelScienceFee:
          this.scienceFees.push(fee);
          break;

        case FeesNames.foodFee:
        case FeesNames.transportFee:
          this.optionalServiceFees.push(fee);
          break;

        case FeesNames.juniorGirlsUniform:
        case FeesNames.juniorBoysUniform:
        case FeesNames.seniorGirlsUniform:
        case FeesNames.seniorBoysUniform:
          this.uniformFees.push(fee);
          break;

        case FeesNames.developmentFee:
          this.developmentFee = fee;
          break;
      }
    });
  }

  private initializeForm(): void {
    const formControls: { [key: string]: FormControl } = {};

    // Standard fees (checkboxes)
    [...this.newStudentFees, ...this.tuitionFees, ...this.scienceFees, ...this.optionalServiceFees].forEach(fee => {
      const existing = this.selectedFees.find(sf => sf.fee.id === fee.id);
      formControls[`fee_${fee.id}`] = this.fb.control(existing ? true : false);
    });

    // Development fee
    if (this.developmentFee) {
      const existing = this.selectedFees.find(sf => sf.fee.id === this.developmentFee!.id);
      formControls[`fee_${this.developmentFee.id}`] = this.fb.control(existing ? true : false);
    }

    // Uniform fees (quantity inputs)
    this.uniformFees.forEach(fee => {
      const existing = this.selectedFees.find(sf => sf.fee.id === fee.id);
      formControls[`fee_${fee.id}_qty`] = this.fb.control(existing ? existing.quantity : 0, [
        Validators.min(0),
        Validators.required,
      ]);
    });

    this.feeForm = this.fb.group(formControls);
    this.cdr.markForCheck();
  }

  private setupFormListeners(): void {
    this.feeForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.updateSelectedFees();
    });
  }

  private updateSelectedFees(): void {
    const selected: FeeSelection[] = [];

    // Process standard fees (checkboxes)
    [...this.newStudentFees, ...this.tuitionFees, ...this.scienceFees, ...this.optionalServiceFees].forEach(fee => {
      const control = this.feeForm.get(`fee_${fee.id}`);
      if (control && control.value === true) {
        selected.push({
          fee,
          quantity: 1,
          totalAmount: fee.amount,
        });
      }
    });

    // Process development fee
    if (this.developmentFee) {
      const control = this.feeForm.get(`fee_${this.developmentFee.id}`);
      if (control && control.value === true) {
        selected.push({
          fee: this.developmentFee,
          quantity: 1,
          totalAmount: this.developmentFee.amount,
        });
      }
    }

    // Process uniform fees (quantity inputs)
    this.uniformFees.forEach(fee => {
      const control = this.feeForm.get(`fee_${fee.id}_qty`);
      if (control && control.value > 0) {
        const quantity = Number(control.value);
        selected.push({
          fee,
          quantity,
          totalAmount: fee.amount * quantity,
        });
      }
    });

    this.feesSelected.emit(selected);
    this.cdr.markForCheck();
  }

  getFeeDisplayName(feeName: FeesNames): string {
    const displayNames: { [key in FeesNames]?: string } = {
      [FeesNames.oLevelApplicationFee]: 'O Level Application Fee',
      [FeesNames.aLevelApplicationFee]: 'A Level Application Fee',
      [FeesNames.admissionFee]: 'Admission Fee',
      [FeesNames.oLevelTuitionDay]: 'O Level Tuition (Day)',
      [FeesNames.aLevelTuitionDay]: 'A Level Tuition (Day)',
      [FeesNames.oLevelTuitionBoarder]: 'O Level Tuition (Boarder)',
      [FeesNames.aLevelTuitionBoarder]: 'A Level Tuition (Boarder)',
      [FeesNames.oLevelScienceFee]: 'O Level Science Fee',
      [FeesNames.alevelScienceFee]: 'A Level Science Fee',
      [FeesNames.developmentFee]: 'Development Fee',
      [FeesNames.foodFee]: 'Food Fee',
      [FeesNames.transportFee]: 'Transport Fee',
      [FeesNames.juniorGirlsUniform]: 'Junior Girls Uniform',
      [FeesNames.juniorBoysUniform]: 'Junior Boys Uniform',
      [FeesNames.seniorGirlsUniform]: 'Senior Girls Uniform',
      [FeesNames.seniorBoysUniform]: 'Senior Boys Uniform',
    };
    return displayNames[feeName] || feeName;
  }

  getTotalAmount(): number {
    if (!this.selectedFees || this.selectedFees.length === 0) {
      return 0;
    }
    
    // For group invoices:
    // - Standard fees (quantity = 1) should be multiplied by number of students
    // - Uniform fees (quantity > 1) are already correctly calculated
    return this.selectedFees.reduce((sum, feeSelection) => {
      if (feeSelection.quantity === 1) {
        // Standard fee: multiply by number of students
        return sum + (feeSelection.fee.amount * Math.max(1, this.numberOfStudents));
      } else {
        // Uniform fee: already calculated correctly (quantity * amount)
        return sum + feeSelection.totalAmount;
      }
    }, 0);
  }

  getUniformQuantity(feeId?: number): number {
    if (!feeId) return 0;
    const selected = this.selectedFees.find(sf => sf.fee.id === feeId);
    return selected ? selected.quantity : 0;
  }

  isStandardFeeSelected(feeId?: number): boolean {
    if (!feeId) return false;
    return this.selectedFees.some(sf => sf.fee.id === feeId && sf.quantity === 1);
  }
}
