import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SubjectsModel } from '../models/subjects.model';
import { MarksModel } from '../models/marks.model';
import { environment } from 'src/environments/environment';
import { ExamType } from '../models/examtype.enum';
import { MarksProgressModel } from '../models/marks-progress.model';

export type AiCommentTone = 'encouraging' | 'balanced' | 'firm';

export interface AiCommentsRequest {
  mark: number;
  maxMark?: number;
  subject?: string;
  /** Optional; if sent, stripped from model output as a safety net. Prefer omitting. */
  studentName?: string;
  className?: string;
  examType?: string;
}

export interface AiCommentsResponse {
  comments: string[];
  success: boolean;
  error?: string;
  source?: 'openai' | 'fallback';
  /** Set by the server from mark percentage (no manual tone picker). */
  appliedTone?: AiCommentTone;
}

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
    subjectCode: string,
    examType: ExamType,
    termId: number
  ): Observable<MarksModel[]> {
    return this.httpClient.get<MarksModel[]>(
      `${this.baseUrl}marks/term/${termId}/${name}/${subjectCode}/${examType}`
    );
  }

  getMarksProgress(
    termId: number,
    clas: string,
    examType: ExamType
  ): Observable<MarksProgressModel[]> {
    return this.httpClient.get<MarksProgressModel[]>(
      `${this.baseUrl}progress/term/${termId}/${clas}/${examType}`
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

  generateCommentOptions(
    request: AiCommentsRequest
  ): Observable<AiCommentsResponse> {
    return this.httpClient.post<AiCommentsResponse>(
      `${environment.apiUrl}/ai/generate-comments`,
      request
    );
  }


  getPerfomanceData(
    termId: number,
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
    }>(`${this.baseUrl}perf/term/${termId}/${name}/${examType}`);
  }

  getStudentMarks(studentNumber: string): Observable<MarksModel[]> {
    return this.httpClient.get<MarksModel[]>(
      `${this.baseUrl}studentMarks/${studentNumber}`
    );
  }
}
