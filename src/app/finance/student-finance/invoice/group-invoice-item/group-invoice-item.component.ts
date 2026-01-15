import {
  Component,
  Input,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceModel } from 'src/app/finance/models/invoice.model';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InvoiceStatus } from 'src/app/finance/enums/invoice-status.enum';
import { PaymentsService } from 'src/app/finance/services/payments.service';

@Component({
  selector: 'app-group-invoice-item',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './group-invoice-item.component.html',
  styleUrls: ['./group-invoice-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupInvoiceItemComponent implements OnInit {
  @Input() groupInvoices: InvoiceModel[] = [];
  @Input() groupInvoiceNumber: string = '';
  @Input() donorNote: string | null = null;

  displayedColumns: string[] = [
    'student',
    'enrollment',
    'invoiceNumber',
    'totalBill',
    'amountPaid',
    'balance',
    'status',
  ];

  isDownloading = false;

  constructor(
    private paymentsService: PaymentsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {}

  getTotalBill(): number {
    return this.groupInvoices.reduce(
      (sum, inv) => sum + (inv.totalBill || 0),
      0
    );
  }

  getTotalAmountPaid(): number {
    return this.groupInvoices.reduce(
      (sum, inv) => sum + (inv.amountPaidOnInvoice || 0),
      0
    );
  }

  getTotalBalance(): number {
    return this.groupInvoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
  }

  getStatusColor(status: InvoiceStatus | string): string {
    const statusStr = String(status).toLowerCase();
    if (statusStr === 'paid') return 'primary';
    if (statusStr === 'pending') return 'accent';
    if (statusStr === 'partially_paid' || statusStr === 'partially paid')
      return 'accent';
    if (statusStr === 'overdue') return 'warn';
    return '';
  }

  downloadGroupInvoice(): void {
    if (!this.groupInvoiceNumber) {
      return;
    }

    this.isDownloading = true;
    this.cdr.markForCheck();

    this.paymentsService.downloadGroupInvoice(this.groupInvoiceNumber).subscribe({
      next: () => {
        this.isDownloading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error downloading group invoice:', error);
        this.isDownloading = false;
        this.cdr.markForCheck();
      },
    });
  }
}

