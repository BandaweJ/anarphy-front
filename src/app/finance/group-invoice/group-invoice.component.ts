import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter, take } from 'rxjs/operators';
import { Actions, ofType } from '@ngrx/effects';
import { TermsModel } from 'src/app/enrolment/models/terms.model';
import { selectTerms } from 'src/app/enrolment/store/enrolment.selectors';
import { fetchTerms } from 'src/app/enrolment/store/enrolment.actions';
import { fetchStudents } from 'src/app/registration/store/registration.actions';
import { EnrolsModel } from 'src/app/enrolment/models/enrols.model';
import { FeesModel } from '../models/fees.model';
import { FeeSelection, GroupInvoicePreview } from '../models/group-invoice.model';
import { invoiceActions, billingActions, feesActions } from '../store/finance.actions';
import { selectStudentsToBill, selectFees } from '../store/finance.selector';
import { ThemeService, Theme } from '../../services/theme.service';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FeeSelectionComponent } from './fee-selection/fee-selection.component';
import { GroupInvoicePreviewComponent } from './preview/group-invoice-preview.component';
import { GroupInvoiceItemComponent } from '../student-finance/invoice/group-invoice-item/group-invoice-item.component';
import { BillModel } from '../models/bill.model';
import { InvoiceModel } from '../models/invoice.model';
import { PaymentsService } from '../services/payments.service';

@Component({
  selector: 'app-group-invoice',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatInputModule,
    MatChipsModule,
    MatSnackBarModule,
    FeeSelectionComponent,
    GroupInvoicePreviewComponent,
    GroupInvoiceItemComponent,
  ],
  templateUrl: './group-invoice.component.html',
  styleUrls: ['./group-invoice.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupInvoiceComponent implements OnInit, OnDestroy {
  // Observables
  terms$: Observable<TermsModel[]>;
  fees$: Observable<FeesModel[]>;
  studentsToBill$: Observable<EnrolsModel[]>;
  
  // Step management
  currentStep = 1;
  readonly totalSteps = 5;
  
  // State
  selectedTerm: TermsModel | null = null;
  selectedStudents: EnrolsModel[] = [];
  selectedFees: FeeSelection[] = [];
  donorNote: string = '';
  
  // Created group invoice data (for step 5)
  createdGroupInvoiceNumber: string | null = null;
  createdGroupInvoices: InvoiceModel[] = [];
  
  // Loading states
  isCreating = false;
  isLoadingGroupInvoice = false;
  
  private destroy$ = new Subject<void>();
  currentTheme: Theme = 'light';

  constructor(
    private store: Store,
    private actions$: Actions,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private paymentsService: PaymentsService
  ) {
    this.terms$ = this.store.select(selectTerms);
    this.fees$ = this.store.select(selectFees);
    this.studentsToBill$ = this.store.select(selectStudentsToBill);
    
    // Fetch initial data
    this.store.dispatch(fetchTerms());
    this.store.dispatch(fetchStudents());
    this.store.dispatch(feesActions.fetchFees());
  }

  ngOnInit(): void {
    this.themeService.theme$.pipe(takeUntil(this.destroy$)).subscribe(theme => {
      this.currentTheme = theme;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Step 1: Term Selection
  onTermSelected(term: TermsModel | null): void {
    this.selectedTerm = term;
    if (term) {
      this.store.dispatch(billingActions.fetchStudentsToBill({ 
        num: term.num, 
        year: term.year 
      }));
      // Clear selected students when term changes
      this.selectedStudents = [];
      this.cdr.markForCheck();
    }
  }

  canProceedToStep2(): boolean {
    return !!this.selectedTerm;
  }

  goToStep2(): void {
    if (this.canProceedToStep2()) {
      this.currentStep = 2;
      this.cdr.markForCheck();
    }
  }

  // Step 2: Student Selection
  onStudentsSelected(students: EnrolsModel[]): void {
    this.selectedStudents = students;
    this.cdr.markForCheck();
  }

  isStudentSelected(enrol: EnrolsModel): boolean {
    return this.selectedStudents.some(
      s => s.student?.studentNumber === enrol.student?.studentNumber && 
           s.num === enrol.num && 
           s.year === enrol.year
    );
  }

  toggleStudentSelection(enrol: EnrolsModel): void {
    const index = this.selectedStudents.findIndex(
      s => s.student?.studentNumber === enrol.student?.studentNumber && 
           s.num === enrol.num && 
           s.year === enrol.year
    );
    
    if (index >= 0) {
      this.selectedStudents.splice(index, 1);
    } else {
      this.selectedStudents.push(enrol);
    }
    this.cdr.markForCheck();
  }

  canProceedToStep3(): boolean {
    return this.selectedStudents.length > 0;
  }

  goToStep3(): void {
    if (this.canProceedToStep3()) {
      this.currentStep = 3;
      this.cdr.markForCheck();
    }
  }

  // Step 3: Fee Selection
  onFeesSelected(fees: FeeSelection[]): void {
    this.selectedFees = fees;
    this.cdr.markForCheck();
  }

  canProceedToStep4(): boolean {
    return this.selectedFees.length > 0 && this.selectedFees.some(f => f.quantity > 0);
  }

  goToStep4(): void {
    if (this.canProceedToStep4()) {
      this.currentStep = 4;
      // Ensure preview data is ready before rendering
      const previewData = this.getPreviewData();
      if (previewData) {
        // Trigger change detection to ensure preview component initializes
        this.cdr.markForCheck();
      }
    }
  }

  // Step 4: Preview & Save
  getPreviewData(): GroupInvoicePreview | null {
    if (!this.selectedTerm || this.selectedStudents.length === 0 || this.selectedFees.length === 0) {
      return null;
    }

    const totalBill = this.selectedFees.reduce((sum, fee) => sum + fee.totalAmount, 0);

    return {
      term: this.selectedTerm,
      students: this.selectedStudents,
      feeSelections: this.selectedFees,
      donorNote: this.donorNote || undefined,
      totalBill,
    };
  }

  goBack(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.cdr.markForCheck();
    }
  }

  confirmAndSave(): void {
    if (!this.selectedTerm || this.selectedStudents.length === 0 || this.selectedFees.length === 0) {
      this.snackBar.open('Please complete all steps before saving.', 'Close', {
        duration: 3000,
      });
      return;
    }

    // Convert fee selections to bills for each student
    // We need to ensure bills are sent as plain objects that can be serialized
    const groupInvoiceData = {
      students: this.selectedStudents.map((enrol) => {
        const bills: any[] = [];
        
        // Add standard fees (quantity = 1) to all students
        this.selectedFees.forEach((feeSelection) => {
          if (feeSelection.quantity === 1 && feeSelection.fee) {
            // Standard fee - add to all students
            // Ensure fee has all required properties
            if (!feeSelection.fee.id) {
              console.error('Fee missing id:', feeSelection.fee);
              return;
            }
            if (feeSelection.fee.amount === undefined || feeSelection.fee.amount === null) {
              console.error('Fee missing amount:', feeSelection.fee);
              return;
            }
            if (!enrol.student || !enrol.student.studentNumber) {
              console.error('Enrol missing student or studentNumber:', enrol);
              return;
            }
            if (!enrol.id) {
              console.error('Enrol missing id:', enrol);
              return;
            }
            
            // Create bill object - use the objects directly as they should be serializable
            // The backend expects full entity objects, so we send them as-is
            bills.push({
              fees: feeSelection.fee,
              student: enrol.student!,
              enrol: enrol,
            });
          }
        });

        // Add uniform fees based on student characteristics
        // Distribute uniforms based on quantity specified and student matching
        this.selectedFees.forEach((feeSelection) => {
          if (feeSelection.quantity > 1 && feeSelection.fee) {
            // Uniform fee - check if this student matches the uniform type
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
              // Ensure fee has all required properties
              if (!feeSelection.fee.id) {
                console.error('Fee missing id:', feeSelection.fee);
                return;
              }
              if (feeSelection.fee.amount === undefined || feeSelection.fee.amount === null) {
                console.error('Fee missing amount:', feeSelection.fee);
                return;
              }
              if (!enrol.student || !enrol.student.studentNumber) {
                console.error('Enrol missing student or studentNumber:', enrol);
                return;
              }
              if (!enrol.id) {
                console.error('Enrol missing id:', enrol);
                return;
              }
              
              // Create bill object - use the objects directly as they should be serializable
              // The backend expects full entity objects, so we send them as-is
              bills.push({
                fees: feeSelection.fee,
                student: enrol.student!,
                enrol: enrol,
              });
            }
          }
        });

        return {
          studentNumber: enrol.student?.studentNumber || '',
          termNum: enrol.num,
          year: enrol.year,
          bills,
        };
      }),
      donorNote: this.donorNote || undefined,
    };

    // Validate all students have student numbers
    const invalidStudents = groupInvoiceData.students.filter(s => !s.studentNumber);
    if (invalidStudents.length > 0) {
      this.snackBar.open('Some selected students are missing student numbers.', 'Close', {
        duration: 3000,
      });
      return;
    }

    // Validate all students have bills
    const studentsWithoutBills = groupInvoiceData.students.filter(s => s.bills.length === 0);
    if (studentsWithoutBills.length > 0) {
      this.snackBar.open('Some students have no bills assigned. Please check fee selections.', 'Close', {
        duration: 3000,
      });
      return;
    }

    // Debug: Log the structure before sending
    console.log('Group invoice data being sent:', JSON.stringify(groupInvoiceData, null, 2));
    
    // Validate bills structure
    groupInvoiceData.students.forEach((studentData, index) => {
      studentData.bills.forEach((bill, billIndex) => {
        if (!bill.fees) {
          console.error(`Student ${index}, Bill ${billIndex}: Missing fees object`, bill);
        } else if (!bill.fees.id) {
          console.error(`Student ${index}, Bill ${billIndex}: Fee missing id`, bill.fees);
        } else if (bill.fees.amount === undefined || bill.fees.amount === null) {
          console.error(`Student ${index}, Bill ${billIndex}: Fee missing amount`, bill.fees);
        }
        if (!bill.student) {
          console.error(`Student ${index}, Bill ${billIndex}: Missing student object`, bill);
        }
        if (!bill.enrol) {
          console.error(`Student ${index}, Bill ${billIndex}: Missing enrol object`, bill);
        }
      });
    });

    // Create a clean, serializable copy of the data to avoid circular reference issues
    // This ensures all nested objects are properly serialized
    const serializableData = JSON.parse(JSON.stringify(groupInvoiceData));

    this.isCreating = true;
    this.cdr.markForCheck();

    // Dispatch group invoice creation with serializable data
    this.store.dispatch(invoiceActions.createGroupInvoice(serializableData));

    // Listen for success/failure
    this.actions$.pipe(
      ofType(invoiceActions.createGroupInvoiceSuccess),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe((action) => {
      this.isCreating = false;
      // Success message is already shown by the effect
      
      // Get the group invoice number from the first invoice
      if (action.invoices && action.invoices.length > 0) {
        const firstInvoice = action.invoices[0];
        if (firstInvoice.groupInvoiceNumber) {
          this.createdGroupInvoiceNumber = firstInvoice.groupInvoiceNumber;
          // Fetch the full group invoice details
          this.fetchGroupInvoice(firstInvoice.groupInvoiceNumber);
        } else {
          // If no group invoice number, just show the invoices
          this.createdGroupInvoices = action.invoices;
          this.currentStep = 5;
          this.cdr.markForCheck();
        }
      } else {
        // Reset form if no invoices returned
        this.reset();
        this.cdr.markForCheck();
      }
    });

    this.actions$.pipe(
      ofType(invoiceActions.createGroupInvoiceFail),
      take(1),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.isCreating = false;
      // Error message is already shown by the effect
      this.cdr.markForCheck();
    });
  }

  reset(): void {
    this.currentStep = 1;
    this.selectedTerm = null;
    this.selectedStudents = [];
    this.selectedFees = [];
    this.donorNote = '';
    this.createdGroupInvoiceNumber = null;
    this.createdGroupInvoices = [];
    this.cdr.markForCheck();
  }

  startNewInvoice(): void {
    this.reset();
  }

  getStepTitle(step: number): string {
    const titles = {
      1: 'Select Term',
      2: 'Select Students',
      3: 'Select Fees',
      4: 'Preview & Confirm',
      5: 'View & Download',
    };
    return titles[step as keyof typeof titles] || '';
  }

  fetchGroupInvoice(groupInvoiceNumber: string): void {
    this.isLoadingGroupInvoice = true;
    this.cdr.markForCheck();

    this.paymentsService.getGroupInvoice(groupInvoiceNumber).subscribe({
      next: (invoices) => {
        this.createdGroupInvoices = invoices;
        this.isLoadingGroupInvoice = false;
        this.currentStep = 5;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching group invoice:', error);
        this.snackBar.open('Error loading group invoice details.', 'Close', {
          duration: 3000,
        });
        this.isLoadingGroupInvoice = false;
        this.cdr.markForCheck();
      },
    });
  }
}
