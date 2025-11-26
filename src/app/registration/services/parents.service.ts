import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ParentsModel } from '../models/parents.model';
import { StudentsModel } from '../models/students.model';

@Injectable({
  providedIn: 'root',
})
export class ParentsService {
  private baseUrl = `${environment.apiUrl}/parents`;

  constructor(private http: HttpClient) {}

  getParents(): Observable<ParentsModel[]> {
    return this.http.get<ParentsModel[]>(this.baseUrl);
  }

  createParent(parent: ParentsModel): Observable<ParentsModel> {
    return this.http.post<ParentsModel>(this.baseUrl, parent);
  }

  updateParent(email: string, parent: Partial<ParentsModel>): Observable<ParentsModel> {
    return this.http.patch<ParentsModel>(`${this.baseUrl}/${encodeURIComponent(email)}`, parent);
  }

  deleteParent(email: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(email)}`);
  }

  getParentStudents(email: string): Observable<StudentsModel[]> {
    return this.http.get<StudentsModel[]>(`${this.baseUrl}/${encodeURIComponent(email)}/students`);
  }

  assignStudentToParent(email: string, studentNumber: string): Observable<StudentsModel> {
    return this.http.post<StudentsModel>(
      `${this.baseUrl}/${encodeURIComponent(email)}/students/${encodeURIComponent(studentNumber)}`,
      {}
    );
  }
}


