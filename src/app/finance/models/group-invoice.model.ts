import { FeesModel } from './fees.model';
import { TermsModel } from 'src/app/enrolment/models/terms.model';
import { EnrolsModel } from 'src/app/enrolment/models/enrols.model';

export interface FeeSelection {
  fee: FeesModel;
  quantity: number; // 1 for standard fees, variable for uniforms
  totalAmount: number; // fee.amount * quantity
}

export interface GroupInvoicePreview {
  term: TermsModel;
  students: EnrolsModel[];
  feeSelections: FeeSelection[];
  donorNote?: string;
  totalBill: number;
}
