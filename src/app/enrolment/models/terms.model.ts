export type TermType = 'regular' | 'vacation';

export interface TermsModel {
  id?: number;
  num: number;
  year: number;
  type?: TermType;
  startDate: Date;
  endDate: Date;
}
