import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
import { Observable, Subject } from 'rxjs';
import { take, takeUntil, filter } from 'rxjs/operators';
import { TermsModel } from 'src/app/enrolment/models/terms.model';
import { selectTerms } from 'src/app/enrolment/store/enrolment.selectors';
import { fetchTerms } from 'src/app/enrolment/store/enrolment.actions';
import { StudentsModel } from 'src/app/registration/models/students.model';
import { fetchStudents } from 'src/app/registration/store/registration.actions';
import { invoiceActions } from '../store/finance.actions';
import { InvoiceModel } from '../models/invoice.model';
import {
  selectedStudentInvoice,
  selectFechInvoiceError,
  selectLoadingInvoice,
  selectInvoiceWarning,
} from '../store/finance.selector';
import { EnrolsModel } from 'src/app/enrolment/models/enrols.model';
import { ThemeService, Theme } from '../../services/theme.service';
import { SharedModule } from '../../shared/shared.module';
import { BillingComponent } from './billing/billing.component';
import { InvoiceItemComponent } from './invoice/invoice-item/invoice-item.component';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-student-finance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    BillingComponent,
    InvoiceItemComponent,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './student-finance.component.html',
  styleUrls: ['./student-finance.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentFinanceComponent implements OnInit, OnDestroy {
  // Simple observables from store
  terms$: Observable<TermsModel[]>;
  invoice$: Observable<InvoiceModel | null>;
  loadingInvoice$: Observable<boolean>;
  error$: Observable<string | null>;
  invoiceWarning$: Observable<{ message: string; voidedInvoiceNumber?: string; voidedAt?: Date; voidedBy?: string } | null>;
  
  selectedTerm: TermsModel | null = null;
  selectedStudentNumber: string | null = null;
  selectedStudent: StudentsModel | null = null;

  private destroy$ = new Subject<void>();
  currentTheme: Theme = 'light';

  constructor(
    private store: Store,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {
    this.terms$ = this.store.select(selectTerms);
    this.invoice$ = this.store.select(selectedStudentInvoice);
    this.loadingInvoice$ = this.store.select(selectLoadingInvoice);
    this.error$ = this.store.select(selectFechInvoiceError);
    this.invoiceWarning$ = this.store.select(selectInvoiceWarning);
    
    // Fetch terms and students on component initialization
    this.store.dispatch(fetchTerms());
    this.store.dispatch(fetchStudents());
  }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.theme$.pipe(takeUntil(this.destroy$)).subscribe(theme => {
      this.currentTheme = theme;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectedStudentChanged(student: StudentsModel): void {
    this.selectedStudent = student;
    this.selectedStudentNumber = student.studentNumber;
  }

  termChanged(term: TermsModel): void {
    this.selectedTerm = term;
  }

         generateInvoice(): void {
           if (
             this.selectedStudentNumber &&
             this.selectedTerm?.num !== undefined &&
             this.selectedTerm?.year !== undefined
           ) {
             this.store.dispatch(
               invoiceActions.fetchInvoice({
                 studentNumber: this.selectedStudentNumber,
                 num: this.selectedTerm.num,
                 year: this.selectedTerm.year,
               })
             );
           }
         }

         saveInvoice(): void {
           // Get the current invoice from the store and save it
           this.invoice$.pipe(take(1)).subscribe(currentInvoice => {
             if (currentInvoice && currentInvoice.invoiceNumber) {
               this.store.dispatch(
                 invoiceActions.saveInvoice({ invoice: currentInvoice })
               );
             } else {
               console.warn('No invoice available to save. Please generate an invoice first.');
             }
           });
         }

  clearSelection(): void {
    this.selectedStudent = null;
    this.selectedStudentNumber = null;
    this.selectedTerm = null;
  }

  isFormValid(): boolean {
    return !!(this.selectedStudentNumber && this.selectedTerm);
  }
}
