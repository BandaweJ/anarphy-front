import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SubjectsModel } from '../models/subjects.model';
import { MarksModel } from '../models/marks.model';
import { environment } from 'src/environments/environment';
import { ExamType } from '../models/examtype.enum';
import { MarksProgressModel } from '../models/marks-progress.model';

@Injectable({
  providedIn: 'root',
})
export class MarksService {
  baseUrl = environment.apiUrl + '/marks/';

  constructor(private httpClient: HttpClient) {}

  getAllSubjects(): Observable<SubjectsModel[]> {
    return this.httpClient.get<SubjectsModel[]>(this.baseUrl + 'subjects');
  }

  addSubject(subject: SubjectsModel): Observable<SubjectsModel> {
    return this.httpClient.post<SubjectsModel>(
      this.baseUrl + 'subjects',
      subject
    );
  }

  editSubject(subject: SubjectsModel): Observable<SubjectsModel> {
    return this.httpClient.patch<SubjectsModel>(
      this.baseUrl + 'subjects',
      subject
    );
  }

  deleteSubject(subject: SubjectsModel): Observable<{ code: string }> {
    return this.httpClient.delete<{ code: string }>(
      this.baseUrl + `subjects/${subject.code}`
    );
  }

  getMarksInClassBySubject(
    name: string,
    num: number,
    year: number,
    subjectCode: string,
    examType: ExamType
  ): Observable<MarksModel[]> {
    return this.httpClient.get<MarksModel[]>(
      `${this.baseUrl}marks/${num}/${year}/${name}/${subjectCode}/${examType}`
    );
  }

  getMarksProgress(
    num: number,
    year: number,
    clas: string,
    // fom: number,
    examType: ExamType
  ): Observable<MarksProgressModel[]> {
    return this.httpClient.get<MarksProgressModel[]>(
      `${this.baseUrl}progress/${num}/${year}/${clas}/${examType}`
    );
  }

  saveMark(mark: MarksModel): Observable<MarksModel> {
    return this.httpClient.post<MarksModel>(this.baseUrl + 'marks/', mark);
  }

  deleteMark(mark: MarksModel): Observable<MarksModel> {
    // console.log(mark);
    return this.httpClient.delete<MarksModel>(
      this.baseUrl + 'marks/' + mark.id
    );
  }


  getPerfomanceData(
    num: number,
    year: number,
    name: string,
    examType: ExamType
  ): Observable<{
    subjects: SubjectsModel[];
    subjectsMarks: Array<MarksModel[]>;
    marks: Array<number[]>;
    xAxes: number[];
  }> {
    return this.httpClient.get<{
      subjects: SubjectsModel[];
      subjectsMarks: Array<MarksModel[]>;
      marks: Array<number[]>;
      xAxes: number[];
    }>(`${this.baseUrl}perf/${num}/${year}/${name}/${examType}`);
  }

  getStudentMarks(studentNumber: string): Observable<MarksModel[]> {
    return this.httpClient.get<MarksModel[]>(
      `${this.baseUrl}studentMarks/${studentNumber}`
    );
  }
}
