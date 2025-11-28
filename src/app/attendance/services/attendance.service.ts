import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AttendanceRecord {
  id?: number;
  studentNumber: string;
  surname: string;
  name: string;
  gender: string;
  present: boolean;
  date: string;
  className: string;
  termNum: number;
  year: number;
  student: any;
}

export interface MarkAttendanceRequest {
  studentNumber: string;
  className: string;
  termNum: number;
  year: number;
  present: boolean;
  date: string;
}

export interface AttendanceReport {
  [date: string]: AttendanceRecord[];
}

export interface DailyAttendanceMetrics {
  date: string;
  possibleAttendance: number;
  actualAttendance: number;
  absentCount: number;
  attendanceRate: number;
  absentStudents: AbsentStudent[];
}

export interface AbsentStudent {
  studentNumber: string;
  surname: string;
  name: string;
  gender: string;
}

export interface WeeklyAttendanceSummary {
  weekStartDate: string;
  weekEndDate: string;
  weekNumber: number;
  totalPossibleAttendance: number;
  totalActualAttendance: number;
  averageAttendanceRate: number;
  daysWithAttendance: number;
}

export interface AttendanceTrend {
  period: string;
  attendanceRate: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface DetailedAttendanceReport {
  className: string;
  termNum: number;
  year: number;
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
  totalStudents: number;
  dailyMetrics: DailyAttendanceMetrics[];
  weeklySummaries: WeeklyAttendanceSummary[];
  trends: AttendanceTrend[];
  overallStats: {
    totalPossibleAttendance: number;
    totalActualAttendance: number;
    overallAttendanceRate: number;
    totalDaysMarked: number;
  };
}

export interface AttendanceSummary {
  className: string;
  termNum: number;
  year: number;
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  attendanceRate: number;
  studentStats: StudentAttendanceStats[];
}

export interface StudentAttendanceStats {
  student: any;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  attendanceRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/attendance`;

  constructor(private http: HttpClient) {}

  getClassAttendance(
    className: string,
    termNum: number,
    year: number,
    date?: string
  ): Observable<AttendanceRecord[]> {
    let url = `${this.apiUrl}/class/${className}/${termNum}/${year}`;
    if (date) {
      url += `?date=${date}`;
    }
    return this.http.get<AttendanceRecord[]>(url);
  }

  markAttendance(request: MarkAttendanceRequest): Observable<AttendanceRecord> {
    return this.http.post<AttendanceRecord>(`${this.apiUrl}/mark`, request);
  }

  getAttendanceReports(
    className: string,
    termNum: number,
    year: number,
    startDate?: string,
    endDate?: string
  ): Observable<DetailedAttendanceReport> {
    let url = `${this.apiUrl}/reports/${className}/${termNum}/${year}`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    return this.http.get<DetailedAttendanceReport>(url);
  }

  getStudentAttendance(
    studentNumber: string,
    termNum: number,
    year: number,
    startDate?: string,
    endDate?: string
  ): Observable<AttendanceRecord[]> {
    let url = `${this.apiUrl}/student/${studentNumber}/${termNum}/${year}`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    return this.http.get<AttendanceRecord[]>(url);
  }

  getAttendanceSummary(
    className: string,
    termNum: number,
    year: number
  ): Observable<AttendanceSummary> {
    return this.http.get<AttendanceSummary>(`${this.apiUrl}/summary/${className}/${termNum}/${year}`);
  }

}