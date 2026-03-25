import { StudentsModel } from 'src/app/registration/models/students.model';
import { TermsModel } from 'src/app/enrolment/models/terms.model';
import { SubjectsModel } from './subjects.model';
import { ExamType } from './examtype.enum';

export interface MarksModel {
  id?: number;
  /** FK to terms — canonical scope for the mark. */
  termId: number;
  /** Populated when the API includes the term relation. */
  term?: TermsModel;
  name: string;
  mark: number | null;
  termMark?: number | null;
  comment: string;
  subject: SubjectsModel;
  student: StudentsModel;
  examType?: ExamType;
}
