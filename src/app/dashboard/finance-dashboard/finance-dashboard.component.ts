import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { select, Store } from '@ngrx/store';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  Subject,
  tap,
} from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { FinanceDataModel } from '../../finance/models/finance-data.model';
import { FinanceFilter } from '../../finance/models/finance-filter.model';
import { FilterFinanceDialogComponent } from './filter-finance-dialog/filter-finance-dialog.component';
import { selectAllCombinedFinanceData } from 'src/app/finance/store/finance.selector';
import {
  invoiceActions,
  receiptActions,
} from 'src/app/finance/store/finance.actions';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';

import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { fetchStudents } from 'src/app/registration/store/registration.actions';
import {
  fetchClasses,
  fetchTerms,
  currentTermActions,
} from 'src/app/enrolment/store/enrolment.actions';
import { selectCurrentTerm } from 'src/app/enrolment/store/enrolment.selectors';

@Component({
  selector: 'app-finance-dashboard',
  templateUrl: './finance-dashboard.component.html',
  styleUrls: ['./finance-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FinanceDashboardComponent
  implements OnInit, OnDestroy, AfterViewInit
{
  // UI State
  isSearchBarVisible = false;
  isLoading = true;
  hasError = false;
  errorMessage = '';

  // Data Management
  private ngUnsubscribe = new Subject<void>();
  private filterSubject = new BehaviorSubject<FinanceFilter>({});
  private sortSubject = new BehaviorSubject<string>('dateDesc');

  // Data Sources
  invoicesDataSource = new MatTableDataSource<FinanceDataModel>([]);
  paymentsDataSource = new MatTableDataSource<FinanceDataModel>([]);

  // Using setters for the paginators to ensure they are always linked to the data source
  @ViewChild('invoicesPaginator') set invoicesPaginator(
    paginator: MatPaginator
  ) {
    if (paginator) {
      this.invoicesDataSource.paginator = paginator;
    }
  }
  @ViewChild('paymentsPaginator') set paymentsPaginator(
    paginator: MatPaginator
  ) {
    if (paginator) {
      this.paymentsDataSource.paginator = paginator;
    }
  }

  @ViewChild(BaseChartDirective) chart!: BaseChartDirective;

  totalInvoices$!: Observable<number>;
  totalPayments$!: Observable<number>;
  totalBalance$!: Observable<number>;
  
  // Additional financial metrics
  averageInvoiceAmount$!: Observable<number>;
  averagePaymentAmount$!: Observable<number>;
  collectionRate$!: Observable<number>;
  totalTransactions$!: Observable<number>;

  currentSort$ = this.sortSubject.asObservable();
  sortOptions = [
    { label: 'Date (Newest)', value: 'dateDesc' },
    { label: 'Date (Oldest)', value: 'dateAsc' },
    { label: 'Amount (Highest)', value: 'amountDesc' },
    { label: 'Amount (Lowest)', value: 'amountAsc' },
    { label: 'Type (A-Z)', value: 'typeAsc' },
  ];

  public barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#666',
          font: {
            size: 12,
            weight: 'normal',
          },
        },
      },
      y: {
        min: 0,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: '#666',
          font: {
            size: 12,
            weight: 'normal',
          },
          callback: function(value) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 14,
            weight: 'bold',
          },
          color: '#333',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed?.y;
            return label + ': $' + (value?.toLocaleString() || '0');
          },
        },
      },
    },
  };
  public barChartType: ChartType = 'bar';
  public barChartData: ChartData<'bar'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Invoices',
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(102, 126, 234, 0.9)',
        hoverBorderColor: 'rgba(102, 126, 234, 1)',
        hoverBorderWidth: 3,
      },
      {
        data: [],
        label: 'Payments',
        backgroundColor: 'rgba(76, 175, 80, 0.8)',
        borderColor: 'rgba(76, 175, 80, 1)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        hoverBackgroundColor: 'rgba(76, 175, 80, 0.9)',
        hoverBorderColor: 'rgba(76, 175, 80, 1)',
        hoverBorderWidth: 3,
      },
    ],
  };

  constructor(
    private store: Store, 
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupDataSubscriptions();
    this.initializeDefaultFilter();
  }

  loadData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.cdr.markForCheck();

    try {
      this.store.dispatch(invoiceActions.fetchAllInvoices());
      this.store.dispatch(receiptActions.fetchAllReceipts());
      this.store.dispatch(fetchStudents());
      this.store.dispatch(fetchTerms());
      this.store.dispatch(fetchClasses());
      this.store.dispatch(currentTermActions.fetchCurrentTerm());
    } catch (error) {
      this.handleError('Failed to load financial data');
    }
  }

  private setupDataSubscriptions(): void {
    const allData$ = this.store.pipe(select(selectAllCombinedFinanceData));

    // Handle data loading and chart updates
    allData$
      .pipe(
        map((data) => this.processChartData(data)),
        tap(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
          if (this.chart) {
            this.chart.update();
          }
        }),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe({
        error: (error) => this.handleError('Failed to process chart data')
      });

    // Create filtered data observable (for widgets and tables)
    const filteredData$ = combineLatest([
      allData$,
      this.filterSubject.asObservable(),
    ]).pipe(
      map(([data, filters]) => this.applyFilters(data, filters)),
      takeUntil(this.ngUnsubscribe)
    );

    // Handle filtered and sorted data (for tables)
    const filteredAndSortedData$ = combineLatest([
      filteredData$,
      this.sortSubject.asObservable(),
    ]).pipe(
      map(([filteredData, sort]) => this.applySorting(filteredData, sort)),
      tap((data) => {
        this.invoicesDataSource.data = data.filter(
          (item) => item.type === 'Invoice'
        );
        this.paymentsDataSource.data = data.filter(
          (item) => item.type === 'Payment'
        );
        this.cdr.markForCheck();
      }),
      takeUntil(this.ngUnsubscribe)
    );

    filteredAndSortedData$.subscribe({
      error: (error) => this.handleError('Failed to filter and sort data')
    });

    // Setup summary observables (using filtered data)
    this.totalInvoices$ = filteredData$.pipe(
      map((data) =>
        data
          .filter((item) => item.type === 'Invoice')
          .reduce((acc, item) => acc + +item.amount, 0)
      )
    );
    this.totalPayments$ = filteredData$.pipe(
      map((data) =>
        data
          .filter((item) => item.type === 'Payment')
          .reduce((acc, item) => acc + +item.amount, 0)
      )
    );
    this.totalBalance$ = combineLatest([
      this.totalInvoices$,
      this.totalPayments$,
    ]).pipe(map(([invoices, payments]) => invoices - payments));

    // Additional financial metrics (using filtered data)
    this.averageInvoiceAmount$ = filteredData$.pipe(
      map((data) => {
        const invoices = data.filter((item) => item.type === 'Invoice');
        return invoices.length > 0 
          ? invoices.reduce((acc, item) => acc + +item.amount, 0) / invoices.length 
          : 0;
      })
    );

    this.averagePaymentAmount$ = filteredData$.pipe(
      map((data) => {
        const payments = data.filter((item) => item.type === 'Payment');
        return payments.length > 0 
          ? payments.reduce((acc, item) => acc + +item.amount, 0) / payments.length 
          : 0;
      })
    );

    this.collectionRate$ = combineLatest([
      this.totalInvoices$,
      this.totalPayments$,
    ]).pipe(
      map(([invoices, payments]) => {
        return invoices > 0 ? (payments / invoices) * 100 : 0;
      })
    );

    this.totalTransactions$ = filteredData$.pipe(
      map((data) => data.length)
    );
  }

  private processChartData(data: FinanceDataModel[]): void {
    const monthlyTotals = new Map<
      string,
      { invoices: number; payments: number }
    >();
    
    data.forEach((item) => {
      const date = new Date(item.transactionDate);
      const monthYear = date.toLocaleString('default', {
        month: 'short',
        year: 'numeric',
      });

      if (!monthlyTotals.has(monthYear)) {
        monthlyTotals.set(monthYear, { invoices: 0, payments: 0 });
      }

      const totals = monthlyTotals.get(monthYear)!;
      if (item.type === 'Invoice') {
        totals.invoices += +item.amount;
      } else {
        totals.payments += +item.amount;
      }
    });

    const sortedKeys = Array.from(monthlyTotals.keys()).sort((a, b) => {
      const [monthA, yearA] = a.split(' ');
      const [monthB, yearB] = b.split(' ');
      const dateA = new Date(`${monthA} 1, ${yearA}`);
      const dateB = new Date(`${monthB} 1, ${yearB}`);
      return dateA.getTime() - dateB.getTime();
    });

    this.barChartData.labels = sortedKeys;
    this.barChartData.datasets[0].data = sortedKeys.map(
      (key) => monthlyTotals.get(key)!.invoices
    );
    this.barChartData.datasets[1].data = sortedKeys.map(
      (key) => monthlyTotals.get(key)!.payments
    );
  }

  private handleError(message: string): void {
    this.hasError = true;
    this.errorMessage = message;
    this.isLoading = false;
    this.cdr.markForCheck();
    console.error(message);
  }

  ngAfterViewInit(): void {
    if (this.chart) {
      this.chart.update();
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  toggleSearchBar(): void {
    this.isSearchBarVisible = !this.isSearchBarVisible;
  }

  onFinancialEntitySelectedFromSearch(entity: FinanceDataModel): void {
    this.filterSubject.next({ studentId: entity.studentId });
  }

  onFilter(): void {
    const dialogRef = this.dialog.open(FilterFinanceDialogComponent, {
      width: '400px',
      data: this.filterSubject.value,
    });

    dialogRef.afterClosed().subscribe((result: FinanceFilter) => {
      if (result) {
        this.filterSubject.next(result);
      }
    });
  }

  onClearFilters(): void {
    // Reset to default filter (current term)
    this.initializeDefaultFilter();
    this.sortSubject.next('dateDesc');
  }

  private initializeDefaultFilter(): void {
    // Subscribe to current term and set default filter
    this.store
      .pipe(
        select(selectCurrentTerm),
        takeUntil(this.ngUnsubscribe)
      )
      .subscribe((currentTerm) => {
        if (currentTerm) {
          // Format term as "num year" to match enrolTerm format in FinanceDataModel
          const enrolTerm = `${currentTerm.num} ${currentTerm.year}`;
          this.filterSubject.next({ enrolTerm });
        } else {
          // If no current term, use empty filter
          this.filterSubject.next({});
        }
        this.cdr.markForCheck();
      });
  }

  onSortChange(sortValue: string): void {
    this.sortSubject.next(sortValue);
  }

  private applyFilters(
    data: FinanceDataModel[],
    filters: FinanceFilter
  ): FinanceDataModel[] {
    if (!filters || Object.keys(filters).length === 0) {
      return data;
    }
    return data.filter((item) => {
      if (filters.transactionType && item.type !== filters.transactionType)
        return false;
      if (
        filters.startDate &&
        new Date(item.date) < new Date(filters.startDate)
      )
        return false;
      if (filters.endDate && new Date(item.date) > new Date(filters.endDate))
        return false;
      if (filters.minAmount && item.amount < filters.minAmount) return false;
      if (filters.maxAmount && item.amount > filters.maxAmount) return false;
      if (filters.enrolTerm && item.enrolTerm !== filters.enrolTerm)
        return false;
      return true;
    });
  }

  private applySorting(
    data: FinanceDataModel[],
    sort: string
  ): FinanceDataModel[] {
    const sortedData = [...data];
    switch (sort) {
      case 'dateDesc':
        return sortedData.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      case 'dateAsc':
        return sortedData.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      case 'amountDesc':
        return sortedData.sort((a, b) => b.amount - a.amount);
      case 'amountAsc':
        return sortedData.sort((a, b) => a.amount - b.amount);
      case 'typeAsc':
        return sortedData.sort((a, b) => a.type.localeCompare(b.type));
      default:
        return sortedData;
    }
  }
}
