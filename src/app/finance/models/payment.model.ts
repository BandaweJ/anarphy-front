import { StudentsModel } from 'src/app/registration/models/students.model';
import { PaymentMethods } from '../enums/payment-methods.enum';
import { EnrolsModel } from 'src/app/enrolment/models/enrols.model';
import { ReceiptInvoiceAllocationsModel } from './receipt-invoice-allocations.model';

export interface ReceiptCreditModel {
  id: number;
  creditAmount: number;
  createdAt?: Date;
  studentCredit?: {
    id: number;
    studentNumber: string;
    amount: number;
  };
}

export interface ReceiptModel {
  id: number;
  receiptNumber: string;
  receiptBookNumber?: string;
  student: StudentsModel;
  amountPaid: number;
  description: string;
  paymentDate: Date;
  paymentMethod: PaymentMethods;
  approved: boolean;
  servedBy: string;
  enrol: EnrolsModel | null;
  allocations: ReceiptInvoiceAllocationsModel[];
  // Credits created from overpayments on this receipt.
  // Backend loads `receipt.receiptCredits.studentCredit` for ledger/reporting.
  receiptCredits?: ReceiptCreditModel[];
  // --- NEW PROPERTIES FOR VOIDING ---
  isVoided: boolean; // Indicates if the receipt has been voided
  voidedBy?: string; // Email of the user who voided the receipt
  voidedAt?: Date; // Timestamp when the receipt was voided
}
