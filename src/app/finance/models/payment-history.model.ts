// src/app/finance/models/payment-history.model.ts

import { PaymentMethods } from '../enums/payment-methods.enum'; // Or wherever PaymentMethods is defined

export interface PaymentHistoryItem {
  id: string; // Unique ID for the history item (receipt ID, or invoice ID, or allocation ID)
  type: 'Payment' | 'Invoice' | 'Allocation' | 'Credit'; // 'Credit' for overpayment converted to student credit
  date: Date;
  description: string;
  amount: number;
  direction: 'in' | 'out'; // 'in' for payments received, 'out' for invoice debits
  relatedDocNumber?: string; // e.g., Receipt Number, Invoice Number
  paymentMethod?: PaymentMethods; // For 'Payment' type
  status?: string; // For 'Invoice' status
}
