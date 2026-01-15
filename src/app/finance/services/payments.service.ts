import { HttpClient, HttpResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable, timeout, catchError, throwError, tap } from 'rxjs';
import { InvoiceModel } from '../models/invoice.model';
import { InvoiceResponseModel } from '../models/invoice-response.model';
import { environment } from 'src/environments/environment';
import { InvoiceStatsModel } from '../models/invoice-stats.model';
import { ReceiptModel } from '../models/payment.model';
import { PaymentMethods } from '../enums/payment-methods.enum';
import {
  CreditTransactionModel,
  CreditTransactionSummaryModel,
  CreditActivityReportModel,
  CreditTransactionQueryParams,
} from '../models/credit-transaction.model';

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  baseURL = `${environment.apiUrl}/payment/`;

  constructor(private httpClient: HttpClient) {}
  getInvoice(
    studentNumber: string,
    num: number,
    year: number
  ): Observable<InvoiceResponseModel> {
    return this.httpClient
      .get<InvoiceResponseModel>(
        `${this.baseURL}invoice/${studentNumber}/${num}/${year}`
      )
      .pipe(
        timeout(30000), // 30 second timeout
        map((response) => {
          // Apply numeric conversions for other fields if needed
          return response;
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  getInvoiceStats(num: number, year: number): Observable<InvoiceStatsModel[]> {
    return this.httpClient.get<InvoiceStatsModel[]>(
      `${this.baseURL}invoice/stats/${num}/${year}`
    );
  }

  getTermInvoices(num: number, year: number): Observable<InvoiceModel[]> {
    return this.httpClient.get<InvoiceModel[]>(
      `${this.baseURL}invoice/${num}/${year}`
    );
  }

  getAllInvoices(): Observable<InvoiceModel[]> {
    return this.httpClient.get<InvoiceModel[]>(`${this.baseURL}invoice/`);
  }

  saveInvoice(invoice: InvoiceModel): Observable<InvoiceModel> {
    try {
      const payload = this.normalizeInvoice(invoice);

      return this.httpClient.post<InvoiceModel>(
        `${this.baseURL}invoice`,
        payload
      );
    } catch (error) {
      return throwError(() => error);
    }
  }
  downloadInvoice(invoiceNumber: string): Observable<HttpResponse<Blob>> {
    return this.httpClient.get(
      `${this.baseURL}invoicepdf/${invoiceNumber}`, // Use baseURL + specific endpoint
      {
        responseType: 'blob',
        observe: 'response', // <--- Crucial change: observe the full response
      }
    );
  }

  getStudentOutstandingBalance(
    studentNumber: string
  ): Observable<{ amountDue: number }> {
    return this.httpClient.get<{ amountDue: number }>(
      `${this.baseURL}studentBalance/${studentNumber}`
    );
  }

  getAllReceipts(): Observable<ReceiptModel[]> {
    return this.httpClient.get<ReceiptModel[]>(`${this.baseURL}receipt/`);
  }

  saveReceipt(
    studentNumber: string,
    amountPaid: number,
    paymentMethod: PaymentMethods,
    description?: string
  ): Observable<ReceiptModel> {
    return this.httpClient.post<ReceiptModel>(`${this.baseURL}receipt/`, {
      studentNumber,
      amountPaid,
      paymentMethod,
      description,
    });
  }

  downloadReceipt(receiptNumber: string): Observable<HttpResponse<Blob>> {
    return this.httpClient.get(
      `${this.baseURL}receiptpdf/${receiptNumber}`, // Use baseURL + specific endpoint
      {
        responseType: 'blob',
        observe: 'response', // <--- Crucial change: observe the full response
      }
    );
  }

  getStudentInvoices(studentNumber: string): Observable<InvoiceModel[]> {
    return this.httpClient.get<InvoiceModel[]>(
      `${this.baseURL}invoice/${studentNumber}`
    );
  }

  getStudentReceipts(studentNumber: string): Observable<ReceiptModel[]> {
    return this.httpClient.get<ReceiptModel[]>(
      `${this.baseURL}receipt/student/${studentNumber}`
    );
  }

  voidReceipt(receiptId: number): Observable<ReceiptModel> {
    return this.httpClient.patch<ReceiptModel>(
      `${this.baseURL}receipt/void/${receiptId}`,
      {}
    );
  }

  voidInvoice(invoiceId: number): Observable<InvoiceModel> {
    return this.httpClient.patch<InvoiceModel>(
      `${this.baseURL}invoice/void/${invoiceId}`,
      {}
    );
  }

  // Credit Transaction History
  getCreditTransactions(
    studentNumber: string,
    query?: CreditTransactionQueryParams,
  ): Observable<CreditTransactionModel[]> {
    let params = new HttpParams();
    if (query?.startDate) {
      params = params.set('startDate', query.startDate);
    }
    if (query?.endDate) {
      params = params.set('endDate', query.endDate);
    }
    if (query?.transactionType) {
      params = params.set('transactionType', query.transactionType);
    }
    if (query?.performedBy) {
      params = params.set('performedBy', query.performedBy);
    }

    return this.httpClient.get<CreditTransactionModel[]>(
      `${this.baseURL}credit-transactions/${studentNumber}`,
      { params },
    );
  }

  getCreditTransactionSummary(
    studentNumber: string,
    startDate?: string,
    endDate?: string,
  ): Observable<CreditTransactionSummaryModel> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.httpClient.get<CreditTransactionSummaryModel>(
      `${this.baseURL}credit-transactions/${studentNumber}/summary`,
      { params },
    );
  }

  getCreditActivityReport(
    startDate?: string,
    endDate?: string,
  ): Observable<CreditActivityReportModel> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }

    return this.httpClient.get<CreditActivityReportModel>(
      `${this.baseURL}credit-activity-report`,
      { params },
    );
  }

  createGroupInvoice(groupInvoiceData: {
    students: Array<{
      studentNumber: string;
      termNum: number;
      year: number;
      bills: any[];
    }>;
    donorNote?: string;
    invoiceDate?: string | Date;
    invoiceDueDate?: string | Date;
  }): Observable<InvoiceModel[]> {
    return this.httpClient.post<InvoiceModel[]>(
      `${this.baseURL}group-invoice`,
      groupInvoiceData
    );
  }

  getGroupInvoice(groupInvoiceNumber: string): Observable<InvoiceModel[]> {
    return this.httpClient.get<InvoiceModel[]>(
      `${this.baseURL}group-invoice/${groupInvoiceNumber}`
    );
  }

  downloadGroupInvoice(groupInvoiceNumber: string): Observable<HttpResponse<Blob>> {
    return this.httpClient.get(
      `${this.baseURL}group-invoice-pdf/${groupInvoiceNumber}`,
      {
        responseType: 'blob',
        observe: 'response',
      }
    ).pipe(
      tap((response: HttpResponse<Blob>) => {
        const blob = response.body;
        if (!blob) {
          throw new Error('No PDF data received');
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `group_invoice_${groupInvoiceNumber}.pdf`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
    );
  }

  private normalizeInvoice(invoice: InvoiceModel): InvoiceModel {
    if (!invoice.student?.studentNumber) {
      throw new Error(
        'Invoice is missing student information. Please select a student and try again.'
      );
    }

    if (!invoice.enrol?.id) {
      throw new Error(
        'Invoice is missing enrolment information. Please select a class/term and try again.'
      );
    }

    if (!invoice.bills || invoice.bills.length === 0) {
      throw new Error(
        'Invoice must have at least one bill. Please add fees before saving.'
      );
    }

    const normalizedBills =
      invoice.bills?.map((bill, index) => {
        if (!bill.fees || bill.fees.amount === undefined || bill.fees.amount === null) {
          throw new Error(
            `Bill #${index + 1} is missing fee details. Please ensure every fee has an amount.`
          );
        }

        const student = bill.student || invoice.student;
        if (!student?.studentNumber) {
          throw new Error(`Bill #${index + 1} is missing student information.`);
        }

        const enrol = bill.enrol || invoice.enrol;
        if (!enrol?.id) {
          throw new Error(`Bill #${index + 1} is missing enrolment information.`);
        }

        return {
          ...bill,
          student,
          enrol,
          fees: bill.fees,
        };
      }) || [];

    return {
      ...invoice,
      student: invoice.student,
      enrol: invoice.enrol,
      bills: normalizedBills,
    };
  }
}
