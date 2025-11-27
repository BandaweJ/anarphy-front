import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Store } from '@ngrx/store';
import { Subject } from 'rxjs';
import { Observable, Subscription } from 'rxjs';
import { filter, take, tap, takeUntil } from 'rxjs/operators';
import {
  selectStudentReceipts,
  selectLoadStudentReceiptsErr,
  selectLoadingStudentReceipts,
} from '../../store/finance.selector';
import { selectUser } from 'src/app/auth/store/auth.selectors';
import { User } from 'src/app/auth/models/user.model';
import { receiptActions } from '../../store/finance.actions';
import { ReceiptModel } from '../../models/payment.model';
import { ThemeService, Theme } from 'src/app/services/theme.service';

@Component({
  selector: 'app-student-receipts',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './student-receipts.component.html',
  styleUrls: ['./student-receipts.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudentReceiptsComponent implements OnInit, OnDestroy {
  // Data Observables
  user$ = this.store.select(selectUser);
  receipts$ = this.store.select(selectStudentReceipts);
  loading$ = this.store.select(selectLoadingStudentReceipts);
  error$ = this.store.select(selectLoadStudentReceiptsErr);
  currentTheme: Theme = 'light';
  private userSubscription: Subscription | undefined;
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme) => {
        this.currentTheme = theme;
        this.cdr.markForCheck();
      });
    
    this.loadReceipts();
  }

  loadReceipts(): void {
    this.userSubscription = this.store
      .select(selectUser)
      .pipe(
        filter((user): user is User => !!user && !!user.id),
        take(1), // Take only the first emitted studentNumber
        tap((user) => {
          this.store.dispatch(
            receiptActions.fetchStudentReceipts({
              studentNumber: user.id,
            })
          );
        })
      )
      .subscribe({
        error: (error) => console.error('Failed to load receipts:', error)
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  /**
   * Dispatches an action to download a specific receipt PDF.
   * @param receiptNumber The unique identifier for the receipt to download.
   */
  downloadReceipt(receiptNumber: string): void {
    if (receiptNumber) {
      this.store.dispatch(
        receiptActions.downloadReceiptPdf({ receiptNumber: receiptNumber })
      );
    } else {
      console.warn('Cannot download receipt: Receipt number is missing.');
    }
  }

  // Helper to determine the class for approved/unapproved receipts (optional, for visual cue)
  getApprovalClass(approved: boolean): string {
    return approved ? 'receipt-approved' : 'receipt-unapproved';
  }

  // TrackBy functions for performance
  trackByReceiptId(index: number, receipt: ReceiptModel): string {
    return receipt.receiptNumber;
  }

  trackByAllocationId(index: number, allocation: any): string {
    return allocation.id || index.toString();
  }

  // Helper methods for receipt status
  isReceiptApproved(receipt: ReceiptModel): boolean {
    return receipt.approved;
  }

  isReceiptRecent(receipt: ReceiptModel): boolean {
    const receiptDate = new Date(receipt.paymentDate);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return receiptDate > sevenDaysAgo;
  }

  getPaymentMethodIcon(method: string): string {
    switch (method.toLowerCase()) {
      case 'cash':
        return 'payments';
      case 'card':
      case 'credit card':
        return 'credit_card';
      case 'bank transfer':
      case 'transfer':
        return 'account_balance';
      case 'check':
        return 'receipt_long';
      default:
        return 'payment';
    }
  }

  /**
   * Print a specific receipt using the on-screen layout.
   * Captures the rendered receipt card via html2canvas and opens a
   * print window so the printed version matches what the user sees.
   */
  async printReceipt(receiptNumber: string): Promise<void> {
    try {
      const elementId = `receipt-card-${receiptNumber}`;
      const receiptElement = document.getElementById(elementId);
      if (!receiptElement) {
        console.warn('Cannot print receipt: element not found', elementId);
        return;
      }

      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(receiptElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const printWindow = window.open('', '_blank', 'width=900,height=1200');
      if (!printWindow) {
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt ${receiptNumber}</title>
            <style>
              @page { size: A4 portrait; margin: 10mm; }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                background: #ffffff;
              }
              img {
                width: 190mm;
                max-width: 190mm;
                height: auto;
                page-break-inside: avoid;
              }
            </style>
          </head>
          <body>
            <img src="${dataUrl}" alt="Receipt ${receiptNumber}" />
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 300);
      };
    } catch (error) {
      console.error('Failed to print receipt', error);
    }
  }
}
