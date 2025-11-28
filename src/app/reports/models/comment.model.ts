import { ReportsModel } from './reports.model';

export interface HeadCommentModel {
  comment: string;
  report: ReportsModel;
}

export interface FormTeacherCommentModel {
  comment: string;
  report: ReportsModel;
}
