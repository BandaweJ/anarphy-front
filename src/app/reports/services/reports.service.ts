import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReportsModel } from '../models/reports.model';
import {
  HeadCommentModel,
  FormTeacherCommentModel,
  ExtraActivitiesModel,
} from '../models/comment.model';
import { environment } from 'src/environments/environment';
import { ExamType } from 'src/app/marks/models/examtype.enum';

export interface ReportReleaseModel {
  id?: number;
  name: string;
  num: number;
  year: number;
  termId?: number;
  examType: string;
  released: boolean;
  releasedAt?: string;
  releasedBy?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  constructor(private httpClient: HttpClient) {}

  baseUrl = environment.apiUrl + '/reports/';

  generateReports(
    name: string,
    termId: number,
    examType: ExamType,
  ): Observable<ReportsModel[]> {
    return this.httpClient.get<ReportsModel[]>(
      `${this.baseUrl}generate/term/${termId}/${name}/${examType}`
    );
  }

  saveReports(
    name: string,
    termId: number,
    examType: ExamType,
    reports: ReportsModel[],
  ): Observable<ReportsModel[]> {
    return this.httpClient.post<ReportsModel[]>(
      `${this.baseUrl}save/term/${termId}/${name}/${examType}`,
      reports
    );
  }

  saveHeadComment(comment: HeadCommentModel): Observable<ReportsModel> {
    return this.httpClient.post<ReportsModel>(`${this.baseUrl}save/head-comment`, comment);
  }

  saveFormTeacherComment(comment: FormTeacherCommentModel): Observable<ReportsModel> {
    return this.httpClient.post<ReportsModel>(`${this.baseUrl}save/form-teacher-comment`, comment);
  }

  saveExtraActivities(payload: ExtraActivitiesModel): Observable<ReportsModel> {
    return this.httpClient.post<ReportsModel>(
      `${this.baseUrl}save/extra-activities`,
      payload,
    );
  }

  viewReports(
    name: string,
    termId: number,
    examType: ExamType,
  ): Observable<ReportsModel[]> {
    return this.httpClient.get<ReportsModel[]>(
      `${this.baseUrl}view/term/${termId}/${name}/${examType}`
    );
  }

  downloadReport(
    name: string,
    termId: number,
    examType: string,
    studentNumber: string,
  ) {
    const result = this.httpClient.get(
      `${this.baseUrl}pdf/term/${termId}/${name}/${examType}/${studentNumber}`,
      {
        observe: 'response',
        responseType: 'blob',
      }
    );

    result.subscribe((response: HttpResponse<Blob>) => {
      this.handlePdfResponse(response);
    });

    return result;
  }

  handlePdfResponse(response: HttpResponse<Blob>) {
    if (response.status === 200) {
      let filename = 'report.pdf';
      const contentDisposition = response.headers.get('Content-Disposition');

      if (contentDisposition && contentDisposition.includes('filename=')) {
        filename = contentDisposition
          .split('filename=')[1]
          .split(';')[0]
          .trim()
          .replace(/"/g, '');
      }

      const blob = response.body;
      const link = document.createElement('a');
      if (blob) {
        link.href = window.URL.createObjectURL(blob);
        link.target = '_blank';
        link.download = filename;
        link.click();
        link.remove();
        window.URL.revokeObjectURL(link.href);
      }
    } else {
      console.error('Error downloading PDF:', response.statusText);
    }
  }

  getStudentReports(studentNumber: string): Observable<ReportsModel[]> {
    return this.httpClient.get<ReportsModel[]>(
      `${this.baseUrl}view/${studentNumber}`
    );
  }

  getReportReleaseStatus(
    name?: string,
    termId?: number,
    examType?: string
  ): Observable<ReportReleaseModel[]> {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (termId !== undefined) params.set('termId', String(termId));
    if (examType) params.set('examType', examType);
    const queryString = params.toString();
    const url = `${this.baseUrl}release${queryString ? `?${queryString}` : ''}`;
    return this.httpClient.get<ReportReleaseModel[]>(url);
  }

  setReportReleaseStatus(payload: {
    name: string;
    termId: number;
    examType: string;
    released: boolean;
  }): Observable<ReportReleaseModel> {
    return this.httpClient.post<ReportReleaseModel>(`${this.baseUrl}release`, payload);
  }
}
