import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { EnrolsModel } from '../models/enrols.model';
import { EnrolStats } from '../models/enrol-stats.model';
import { environment } from 'src/environments/environment';
import { StudentsSummary } from '../models/students-summary.model';

@Injectable({
  providedIn: 'root',
})
export class EnrolService {
  baseURL = `${environment.apiUrl}/enrolment/enrol/`;

  constructor(private httpClient: HttpClient) {}

  getTermEnrolments(num: number, year: number): Observable<EnrolsModel[]> {
    return this.httpClient.get<EnrolsModel[]>(`${this.baseURL}${num}/${year}`);
  }

  getEnrolmentByClass(
    name: string,
    num: number,
    year: number
  ): Observable<EnrolsModel[]> {
    return this.httpClient.get<EnrolsModel[]>(
      `${this.baseURL}${name}/${num}/${year}`
    );
  }

  getCurrentEnrolment(studentNumber: string): Observable<EnrolsModel> {
    return this.httpClient.get<EnrolsModel>(`${this.baseURL}${studentNumber}`);
  }

  updateCurrentEnrolment(enrol: EnrolsModel): Observable<EnrolsModel> {
    return this.httpClient.patch<EnrolsModel>(`${this.baseURL}`, enrol);
  }

  enrolStudents(enrols: EnrolsModel[]): Observable<EnrolsModel[]> {
    return this.httpClient.post<EnrolsModel[]>(this.baseURL, enrols);
  }

  getEnrolsStats(): Observable<EnrolStats> {
    return this.httpClient.get<EnrolStats>(this.baseURL);
  }

  getTotalEnrolment(num: number, year: number): Observable<StudentsSummary> {
    const requestUrl = `${this.baseURL}summary/${num}/${year}`;
    // <-- ADD THIS LINE

    return this.httpClient.get<StudentsSummary>(requestUrl);
  }

  unenrolStudent(enrol: EnrolsModel): Observable<EnrolsModel> {
    return this.httpClient.delete<EnrolsModel>(this.baseURL + enrol.id);
  }

  migrateClass(
    fromName: string,
    fromNum: number,
    fromYear: number,
    toName: string,
    toNum: number,
    toYear: number
  ): Observable<boolean> {
    return this.httpClient.get<boolean>(
      `${this.baseURL}migrate/${fromName}/${fromNum}/${fromYear}/${toName}/${toNum}/${toYear}`
    );
  }

  isNewComer(studentNumber: string): Observable<boolean> {
    return this.httpClient.get<boolean>(
      `${this.baseURL}newcomers/${studentNumber}`
    );
  }

  getLatestEnrolmentWithStatus(studentNumber: string): Observable<{ enrolment: EnrolsModel; status: 'past' | 'current' | 'upcoming' } | null> {
    return this.httpClient.get<{ enrolment: EnrolsModel; status: 'past' | 'current' | 'upcoming' } | null>(
      `${this.baseURL}${studentNumber}/latest`
    );
  }
}
