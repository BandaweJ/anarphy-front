export interface SubjectInfoModel {
  subjectCode: string;
  subjectName: string;
  mark: number;
  termMark?: number;
  averageMark: number;
  position: number;
  comment: string;
  grade: string;
}
