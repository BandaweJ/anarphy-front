import { Component, EventEmitter, Output, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Store } from '@ngrx/store';
import { Subject, Observable } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { InvoiceModel } from 'src/app/finance/models/invoice.model';
import { selectTermInvoices } from 'src/app/finance/store/finance.selector';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ThemeService, Theme } from 'src/app/services/theme.service';
import { PaymentsService } from 'src/app/finance/services/payments.service';

interface GroupedInvoice {
  groupInvoiceNumber: string;
  invoices: InvoiceModel[];
  donorNote?: string | null;
  totalBill: number;
  totalPaid: number;
  totalBalance: number;
}

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [
    CommonModule,
    MatListModule,
    MatIconModule,
    MatExpansionModule,
    MatChipsModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceListComponent implements OnInit, OnDestroy {
  @Output() invoiceSelected = new EventEmitter<InvoiceModel>();
  @Input() selectedInvoice: InvoiceModel | null = null;
  
  invoices$ = this.store.select(selectTermInvoices);
  groupedInvoices$: Observable<GroupedInvoice[]> = this.invoices$.pipe(
    map((invoices) => this.groupInvoices(invoices))
  );
  currentTheme: Theme = 'light';
  downloadingGroupInvoices = new Set<string>(); // Track which group invoices are being downloaded
  
  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    public themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    private paymentsService: PaymentsService
  ) {}

  ngOnInit(): void {
    this.themeService.theme$
      .pipe(takeUntil(this.destroy$))
      .subscribe((theme) => {
        this.currentTheme = theme;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectInvoice(invoice: InvoiceModel) {
    this.invoiceSelected.emit(invoice);
  }

  isSelected(invoice: InvoiceModel): boolean {
    return this.selectedInvoice?.invoiceNumber === invoice.invoiceNumber;
  }

  private groupInvoices(invoices: InvoiceModel[]): GroupedInvoice[] {
    const grouped = new Map<string, InvoiceModel[]>();
    const standalone: InvoiceModel[] = [];

    // Separate invoices into groups and standalone
    invoices.forEach((invoice) => {
      if (invoice.groupInvoiceNumber) {
        const groupNum = invoice.groupInvoiceNumber;
        if (!grouped.has(groupNum)) {
          grouped.set(groupNum, []);
        }
        grouped.get(groupNum)!.push(invoice);
      } else {
        standalone.push(invoice);
      }
    });

    // Convert grouped invoices to GroupedInvoice objects
    const groupedInvoices: GroupedInvoice[] = Array.from(grouped.entries()).map(
      ([groupInvoiceNumber, groupInvoices]) => {
        const totalBill = groupInvoices.reduce(
          (sum, inv) => sum + (inv.totalBill || 0),
          0
        );
        const totalPaid = groupInvoices.reduce(
          (sum, inv) => sum + (inv.amountPaidOnInvoice || 0),
          0
        );
        const totalBalance = groupInvoices.reduce(
          (sum, inv) => sum + (inv.balance || 0),
          0
        );

        return {
          groupInvoiceNumber,
          invoices: groupInvoices,
          donorNote: groupInvoices[0]?.donorNote || null,
          totalBill,
          totalPaid,
          totalBalance,
        };
      }
    );

    // Add standalone invoices as individual groups
    standalone.forEach((invoice) => {
      groupedInvoices.push({
        groupInvoiceNumber: invoice.invoiceNumber,
        invoices: [invoice],
        donorNote: null,
        totalBill: invoice.totalBill || 0,
        totalPaid: invoice.amountPaidOnInvoice || 0,
        totalBalance: invoice.balance || 0,
      });
    });

    return groupedInvoices;
  }

  selectInvoiceFromGroup(invoice: InvoiceModel): void {
    this.selectInvoice(invoice);
  }

  isGroupInvoice(group: GroupedInvoice): boolean {
    return group.invoices.length > 1;
  }

  downloadGroupInvoice(groupInvoiceNumber: string, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Prevent expansion panel from toggling
    }

    if (!groupInvoiceNumber || this.downloadingGroupInvoices.has(groupInvoiceNumber)) {
      return;
    }

    this.downloadingGroupInvoices.add(groupInvoiceNumber);
    this.cdr.markForCheck();

    this.paymentsService.downloadGroupInvoice(groupInvoiceNumber).subscribe({
      next: () => {
        this.downloadingGroupInvoices.delete(groupInvoiceNumber);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error downloading group invoice:', error);
        this.downloadingGroupInvoices.delete(groupInvoiceNumber);
        this.cdr.markForCheck();
      },
    });
  }

  isDownloading(groupInvoiceNumber: string): boolean {
    return this.downloadingGroupInvoices.has(groupInvoiceNumber);
  }
}
