import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Store } from '@ngrx/store';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, firstValueFrom, combineLatest } from 'rxjs';
import { takeUntil, tap } from 'rxjs/operators';
import jsPDF from 'jspdf';
import { applyPlugin } from 'jspdf-autotable';

// Apply the plugin to jsPDF
applyPlugin(jsPDF);
import { ClassesModel } from 'src/app/enrolment/models/classes.model';
import { TermsModel } from 'src/app/enrolment/models/terms.model';
import {
  fetchClasses,
  fetchTerms,
} from 'src/app/enrolment/store/enrolment.actions';
import {
  selectClasses,
  selectTerms,
} from 'src/app/enrolment/store/enrolment.selectors';
import { attendanceActions } from '../store/attendance.actions';
import { 
  selectAttendanceReports, 
  selectAttendanceSummary, 
  selectAttendanceLoading, 
  selectAttendanceError 
} from '../store/attendance.selectors';
import { DetailedAttendanceReport, AttendanceSummary } from '../services/attendance.service';

@Component({
  selector: 'app-attendance-reports',
  templateUrl: './attendance-reports.component.html',
  styleUrls: ['./attendance-reports.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttendanceReportsComponent implements OnInit, OnDestroy {
  terms$!: Observable<TermsModel[]>;
  classes$!: Observable<ClassesModel[]>;
  reportsForm!: FormGroup;
  attendanceReports$!: Observable<DetailedAttendanceReport | null>;
  attendanceSummary$!: Observable<AttendanceSummary | null>;
  isLoading$!: Observable<boolean>;
  errorMsg$!: Observable<string>;
  
  destroy$ = new Subject<void>();

  constructor(
    public title: Title,
    private store: Store,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.store.dispatch(fetchClasses());
    this.store.dispatch(fetchTerms());
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupObservables();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.reportsForm = new FormGroup({
      term: new FormControl('', [Validators.required]),
      clas: new FormControl('', [Validators.required]),
    });
  }

  private setupObservables(): void {
    this.classes$ = this.store.select(selectClasses);
    this.terms$ = this.store.select(selectTerms);
    this.attendanceReports$ = this.store.select(selectAttendanceReports);
    this.attendanceSummary$ = this.store.select(selectAttendanceSummary);
    this.isLoading$ = this.store.select(selectAttendanceLoading);
    this.errorMsg$ = this.store.select(selectAttendanceError);

    // Debug: Log reports when they change
    this.attendanceReports$.pipe(
      takeUntil(this.destroy$),
      tap(reports => {
        console.log('Attendance Reports:', reports);
        if (reports) {
          console.log('Reports keys:', Object.keys(reports));
          console.log('Reports count:', Object.keys(reports).length);
        }
      })
    ).subscribe();

    // Handle error messages
    this.errorMsg$.pipe(
      takeUntil(this.destroy$),
      tap(errorMsg => {
        if (errorMsg) {
          console.error('Attendance Reports Error:', errorMsg);
          this.snackBar.open(errorMsg, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      })
    ).subscribe();
  }

  get term() {
    return this.reportsForm.get('term');
  }

  get clas() {
    return this.reportsForm.get('clas');
  }

  generateReports(): void {
    if (this.reportsForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    const name = this.clas?.value;
    const term: TermsModel = this.term?.value;
    const num = term.num;
    const year = term.year;

    // Don't filter by date - get all attendance records for the term
    // This matches the behavior of getAttendanceSummary which doesn't filter by date
    // Date filtering can exclude records if attendance was marked outside the term's official dates
    const startDate = undefined;
    const endDate = undefined;

    // Generate both reports and summary
    this.store.dispatch(
      attendanceActions.getAttendanceReports({
        className: name,
        termNum: num,
        year,
        startDate,
        endDate
      })
    );

    this.store.dispatch(
      attendanceActions.getAttendanceSummary({
        className: name,
        termNum: num,
        year
      })
    );
  }

  private markFormGroupTouched(): void {
    Object.keys(this.reportsForm.controls).forEach(key => {
      const control = this.reportsForm.get(key);
      control?.markAsTouched();
    });
  }

  getFormErrorMessage(controlName: string): string {
    const control = this.reportsForm.get(controlName);
    if (control?.hasError('required')) {
      return `${this.getFieldDisplayName(controlName)} is required`;
    }
    return '';
  }

  private getFieldDisplayName(controlName: string): string {
    const fieldNames: { [key: string]: string } = {
      term: 'Term',
      clas: 'Class'
    };
    return fieldNames[controlName] || controlName;
  }

  hasReports(reports: DetailedAttendanceReport | null): boolean {
    return reports !== null && reports.dailyMetrics && reports.dailyMetrics.length > 0;
  }

  getAttendanceStatusIcon(present: boolean): string {
    return present ? 'check_circle' : 'cancel';
  }

  getAttendanceStatusColor(present: boolean): string {
    return present ? 'present' : 'absent';
  }

  getAttendanceStatusText(present: boolean): string {
    return present ? 'Present' : 'Absent';
  }

  getGenderIcon(gender: string): string {
    return gender?.toLowerCase() === 'male' ? 'male' : 'female';
  }

  getGenderColor(gender: string): string {
    return gender?.toLowerCase() === 'male' ? 'male' : 'female';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getRateClass(rate: number): string {
    if (rate >= 90) return 'rate-excellent';
    if (rate >= 75) return 'rate-good';
    if (rate >= 60) return 'rate-fair';
    return 'rate-poor';
  }

  getTrendIcon(trend: 'improving' | 'declining' | 'stable'): string {
    switch (trend) {
      case 'improving':
        return 'trending_up';
      case 'declining':
        return 'trending_down';
      default:
        return 'trending_flat';
    }
  }

  calculateAttendanceRate(summary: AttendanceSummary | null): number {
    if (!summary || summary.totalRecords === 0) return 0;
    return Math.round((summary.presentCount / summary.totalRecords) * 100);
  }

  async exportToPDF(): Promise<void> {
    try {
      const reports = await firstValueFrom(this.attendanceReports$);

      if (!reports || !this.hasReports(reports)) {
        this.snackBar.open('No reports available to export. Please generate reports first.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        return;
      }

      const doc = new jsPDF('portrait', 'mm', 'a4') as any;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Detailed Attendance Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Class: ${reports.className}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
      doc.text(`Term ${reports.termNum}, ${reports.year}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      // Overall Stats
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Overall Statistics', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const overallStatsData = [
        ['Total Students', reports.totalStudents.toString()],
        ['Total Possible Attendance', reports.overallStats.totalPossibleAttendance.toString()],
        ['Total Actual Attendance', reports.overallStats.totalActualAttendance.toString()],
        ['Overall Attendance Rate', `${reports.overallStats.overallAttendanceRate}%`],
        ['Days Marked', reports.overallStats.totalDaysMarked.toString()]
      ];

      doc.autoTable({
        startY: yPosition,
        head: [['Metric', 'Value']],
        body: overallStatsData,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10 },
        margin: { left: margin, right: margin },
      });

      yPosition = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPosition + 30;

      // Weekly Summaries
      if (reports.weeklySummaries.length > 0) {
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Weekly Attendance Summary', margin, yPosition);
        yPosition += 8;

        const weeklyData = reports.weeklySummaries.map(week => [
          `Week ${week.weekNumber}`,
          this.formatDate(week.weekStartDate),
          this.formatDate(week.weekEndDate),
          week.totalPossibleAttendance.toString(),
          week.totalActualAttendance.toString(),
          `${week.averageAttendanceRate}%`,
          week.daysWithAttendance.toString()
        ]);

        doc.autoTable({
          startY: yPosition,
          head: [['Week', 'Start Date', 'End Date', 'Possible', 'Actual', 'Rate', 'Days']],
          body: weeklyData,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
          bodyStyles: { fontSize: 9 },
          margin: { left: margin, right: margin },
        });

        yPosition = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPosition + 30;
      }

      // Daily Metrics
      reports.dailyMetrics.forEach((day) => {
        if (yPosition > pageHeight - 80) {
          doc.addPage();
          yPosition = margin;
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(this.formatDate(day.date), margin, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const dayMetricsData = [
          ['Possible Attendance', day.possibleAttendance.toString()],
          ['Actual Attendance', day.actualAttendance.toString()],
          ['Number Absent', day.absentCount.toString()],
          ['Attendance Rate', `${day.attendanceRate}%`]
        ];

        doc.autoTable({
          startY: yPosition,
          head: [['Metric', 'Value']],
          body: dayMetricsData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10 },
          margin: { left: margin, right: margin },
        });

        yPosition = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : yPosition + 25;

        // Absent Students
        if (day.absentStudents.length > 0) {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(`Absent Students (${day.absentStudents.length}):`, margin, yPosition);
          yPosition += 6;

          const absentData = day.absentStudents.map(student => [
            student.studentNumber,
            `${student.surname}, ${student.name}`,
            student.gender
          ]);

          doc.autoTable({
            startY: yPosition,
            head: [['Student Number', 'Name', 'Gender']],
            body: absentData,
            theme: 'striped',
            headStyles: { fillColor: [244, 67, 54], textColor: 255, fontStyle: 'bold' },
            bodyStyles: { fontSize: 9 },
            margin: { left: margin, right: margin },
          });

          yPosition = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPosition + 25;
        } else {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.text('All students present', margin, yPosition);
          yPosition += 6;
        }
      });

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} of ${totalPages} | Generated on ${new Date().toLocaleDateString()}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      const sanitizedClassName = reports.className.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `Attendance_Report_${sanitizedClassName}_Term${reports.termNum}_${reports.year}_${new Date().toISOString().split('T')[0]}.pdf`;

      doc.save(fileName);

      this.snackBar.open('PDF exported successfully', 'Close', {
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      this.snackBar.open('Failed to export PDF. Please try again.', 'Close', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
    }
  }
}

