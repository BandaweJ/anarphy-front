import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { GroupInvoicePreview, FeeSelection } from '../../models/group-invoice.model';
import { EnrolsModel } from 'src/app/enrolment/models/enrols.model';
import { FeesNames } from '../../enums/fees-names.enum';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';

interface StudentInvoicePreview {
  student: EnrolsModel;
  bills: Array<{
    feeName: string;
    amount: number;
  }>;
  total: number;
}

@Component({
  selector: 'app-group-invoice-preview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatDividerModule,
    CurrencyPipe,
  ],
  templateUrl: './group-invoice-preview.component.html',
  styleUrls: ['./group-invoice-preview.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupInvoicePreviewComponent implements OnInit, OnChanges {
  @Input() previewData!: GroupInvoicePreview | null;

  studentPreviews: StudentInvoicePreview[] = [];
  displayedColumns: string[] = ['student', 'bills', 'total'];
  grandTotal: number = 0;

  get hasValidData(): boolean {
    return !!(
      this.previewData &&
      this.previewData.students &&
      Array.isArray(this.previewData.students) &&
      this.previewData.students.length > 0 &&
      this.previewData.feeSelections &&
      Array.isArray(this.previewData.feeSelections) &&
      this.studentPreviews.length > 0
    );
  }

  get safePreviewData(): GroupInvoicePreview {
    return this.previewData!;
  }

  get termNum(): number {
    return this.previewData?.term?.num || 0;
  }

  get termYear(): number {
    return this.previewData?.term?.year || 0;
  }

  get studentsCount(): number {
    return this.previewData?.students?.length || 0;
  }

  get feeSelectionsCount(): number {
    return this.previewData?.feeSelections?.length || 0;
  }

  get donorNoteText(): string | null {
    return this.previewData?.donorNote || null;
  }

  getStudentTotal(preview: StudentInvoicePreview | null | undefined): number {
    if (!preview) {
      return 0;
    }
    // Always calculate from bills if available, as it's the source of truth
    if (preview.bills && preview.bills.length > 0) {
      const calculatedTotal = preview.bills.reduce((sum, bill) => {
        const amount = bill?.amount || 0;
        if (typeof amount === 'number' && !isNaN(amount) && amount > 0) {
          return sum + amount;
        }
        return sum;
      }, 0);
      // Return calculated total (even if it's 0, as long as bills exist)
      return calculatedTotal;
    }
    // Fallback to preview.total if bills are not available
    const total = preview.total;
    if (total === undefined || total === null || isNaN(total)) {
      return 0;
    }
    return total;
  }

  getStudentPreviews(): StudentInvoicePreview[] {
    return this.studentPreviews || [];
  }

  getGrandTotal(): number {
    // Always calculate from student previews to ensure accuracy
    const previews = this.getStudentPreviews();
    if (previews.length > 0) {
      const calculated = previews.reduce((sum, preview) => {
        if (!preview) {
          return sum;
        }
        const total = preview.total;
        if (total === undefined || total === null || isNaN(total)) {
          return sum;
        }
        return sum + total;
      }, 0);
      return calculated;
    }
    return 0;
  }

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    if (this.previewData) {
      this.calculateStudentPreviews();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previewData']) {
      if (this.previewData) {
        this.calculateStudentPreviews();
      } else {
        // Reset if previewData is cleared
        this.studentPreviews = [];
        this.grandTotal = 0;
        this.cdr.markForCheck();
      }
    }
  }

  private calculateStudentPreviews(): void {
    this.studentPreviews = [];
    this.grandTotal = 0;

    if (!this.previewData || !this.previewData.students || !this.previewData.feeSelections) {
      this.cdr.markForCheck();
      return;
    }

    if (!Array.isArray(this.previewData.students) || this.previewData.students.length === 0) {
      this.cdr.markForCheck();
      return;
    }

    if (!Array.isArray(this.previewData.feeSelections) || this.previewData.feeSelections.length === 0) {
      this.cdr.markForCheck();
      return;
    }

    this.previewData.students.forEach(enrol => {
      if (!enrol || !enrol.student) {
        return; // Skip invalid enrolments
      }

      const bills: Array<{ feeName: string; amount: number }> = [];
      let studentTotal = 0;

      // Add standard fees (quantity = 1) to all students
      if (this.previewData?.feeSelections) {
        this.previewData.feeSelections.forEach(feeSelection => {
          if (feeSelection && feeSelection.quantity === 1 && feeSelection.fee && feeSelection.fee.amount !== undefined) {
            bills.push({
              feeName: this.getFeeDisplayName(feeSelection.fee.name),
              amount: feeSelection.fee.amount,
            });
            studentTotal += feeSelection.fee.amount;
          }
        });
      }

      // Add uniform fees based on student characteristics
      // Distribute uniforms based on quantity specified and student matching
      if (this.previewData?.feeSelections) {
        this.previewData.feeSelections.forEach(feeSelection => {
          if (feeSelection && feeSelection.quantity > 1 && feeSelection.fee && feeSelection.fee.amount !== undefined) {
            const feeName = feeSelection.fee.name;
            const studentGender = enrol.student?.gender?.toLowerCase() || '';
            const isMale = studentGender === 'male';
            const isFemale = studentGender === 'female';
            
            // Determine academic level from class name (1-4 = Junior/O Level, 5-6 = Senior/A Level)
            const classFirstChar = enrol.name?.charAt(0) || '';
            const isJunior = ['1', '2', '3', '4'].includes(classFirstChar);
            const isSenior = ['5', '6'].includes(classFirstChar);
            
            let shouldAdd = false;
            
            // Match uniform type to student characteristics
            if (feeName === 'juniorGirlsUniform' && isJunior && isFemale) {
              shouldAdd = true;
            } else if (feeName === 'juniorBoysUniform' && isJunior && isMale) {
              shouldAdd = true;
            } else if (feeName === 'seniorGirlsUniform' && isSenior && isFemale) {
              shouldAdd = true;
            } else if (feeName === 'seniorBoysUniform' && isSenior && isMale) {
              shouldAdd = true;
            }
            
            if (shouldAdd) {
              bills.push({
                feeName: this.getFeeDisplayName(feeSelection.fee.name),
                amount: feeSelection.fee.amount,
              });
              studentTotal += feeSelection.fee.amount;
            }
          }
        });
      }

      // Recalculate total from bills to ensure accuracy
      const calculatedFromBills = bills.reduce((sum, bill) => {
        const amount = bill?.amount || 0;
        return sum + (typeof amount === 'number' && !isNaN(amount) ? amount : 0);
      }, 0);
      
      // Always use calculated total from bills (it's the source of truth)
      const finalTotal = calculatedFromBills;

      this.studentPreviews.push({
        student: enrol,
        bills,
        total: finalTotal,
      });

      this.grandTotal += finalTotal;
    });

    // Ensure grandTotal is calculated correctly from all student totals
    const recalculatedTotal = this.studentPreviews.reduce((sum, preview) => {
      if (!preview) return sum;
      // Calculate from bills if total is 0 or invalid
      let total = preview.total;
      if ((!total || total === 0) && preview.bills && preview.bills.length > 0) {
        total = preview.bills.reduce((billSum, bill) => billSum + (bill?.amount || 0), 0);
      }
      return sum + (total || 0);
    }, 0);
    this.grandTotal = recalculatedTotal;

    this.cdr.markForCheck();
  }

  getFeeDisplayName(feeName: FeesNames | string): string {
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
    return displayNames[feeName as FeesNames] || feeName;
  }
}
