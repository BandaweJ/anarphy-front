import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SigninComponent } from './auth/signin/signin.component';
import { SignupComponent } from './auth/signup/signup.component';
import { DashboardComponent } from './dashboard/dashboard/dashboard.component';
import { AuthGuardService } from './auth/auth-guard.service';
import { BootstrapTeachersGuard } from './auth/bootstrap-teachers-guard.service';
import { StudentsListComponent } from './registration/students-list/students-list.component';
import { TeachersListComponent } from './registration/teachers-list/teachers-list.component';
import { TermsClassesComponent } from './enrolment/terms-classes/terms-classes.component';
import { TermsComponent } from './enrolment/terms-classes/terms/terms.component';
import { ClassesComponent } from './enrolment/terms-classes/classes/classes.component';
import { SubjectsComponent } from './marks/subjects/subjects.component';
import { EnterMarksComponent } from './marks/enter-marks/enter-marks.component';
import { ReportsComponent } from './reports/reports/reports.component';
import { MarkRegisterComponent } from './attendance/mark-register/mark-register.component';
import { AttendanceReportsComponent } from './attendance/attendance-reports/attendance-reports.component';
import { MigrateClassEnrolmentComponent } from './enrolment/migrate-class-enrolment/migrate-class-enrolment.component';
import { TeachersCommentsComponent } from './marks/teachers-comments/teachers-comments.component';
import { MarksSheetsComponent } from './marks/marks-sheets/marks-sheets.component';
import { ProfileComponent } from './auth/profile/profile.component';
import { TeacherViewComponent } from './registration/teachers-list/teacher-view/teacher-view.component';
import { StudentViewComponent } from './registration/students-list/student-view/student-view.component';
import { ClassListsComponent } from './enrolment/terms-classes/class-lists/class-lists.component';
import { MarksProgressComponent } from './marks/marks-progress/marks-progress.component';
// FeesComponent is lazy loaded
// StudentFinanceComponent is lazy loaded
// StudentBalancesComponent is now standalone and lazy loaded
// InvoiceComponent is lazy loaded
// PaymentsComponent is now standalone and lazy loaded
// StudentFinancialsDashboardComponent is now standalone and lazy loaded
// StudentInvoicesComponent is now standalone and lazy loaded
// StudentReceiptsComponent is now standalone and lazy loaded
// StudentPaymentHistoryComponent is now standalone and lazy loaded
// StudentLedgerReportComponent is now standalone and lazy loaded
// OutstandingFeesReportComponent is now standalone and lazy loaded
import { FeesCollectionReportComponent } from './finance/reports/fees-collection-report/fees-collection-report.component';
// OutstandingFeesReportComponent is now standalone and lazy loaded
// AgedDebtorsReportComponent is now standalone and lazy-loaded
import { RevenueRecognitionReportComponent } from './finance/reports/revenue-recognition-report/revenue-recognition-report.component';
// EnrollmentBillingReconciliationReportComponent is now standalone and lazy-loaded
import { ResultsAnalysisComponent } from './results-analysis/results-analysis.component';
import { ExemptionReportsComponent } from './finance/reports/exemption-reports/exemption-reports/exemption-reports.component';
// Lazy loaded - removed direct import
import { ParentDashboardComponent } from './dashboard/parent-dashboard/parent-dashboard.component';
import { ParentsListComponent } from './registration/parents-list/parents-list.component';

const routes: Routes = [
  { path: 'signin', component: SigninComponent, title: 'Sign In' },
  { path: 'signup', component: SignupComponent, title: 'Sign Up' },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuardService],
    title: 'Profile',
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    title: 'Dashboard',
    canActivate: [AuthGuardService],
  },
  {
    path: 'parent-dashboard',
    loadComponent: () =>
      import('./dashboard/parent-dashboard/parent-dashboard.component').then(
        (m) => m.ParentDashboardComponent
      ),
    canActivate: [AuthGuardService],
    title: 'Parent Dashboard',
  },
  {
    path: 'teachers',
    component: TeachersListComponent,
    canActivate: [AuthGuardService],
    canDeactivate: [BootstrapTeachersGuard],
    title: 'Manage Teachers',
  },
  {
    path: 'parents',
    component: ParentsListComponent,
    canActivate: [AuthGuardService],
    title: 'Manage Parents',
  },
  {
    path: 'teacher-view/:id',
    component: TeacherViewComponent,
    canActivate: [AuthGuardService],
    title: 'Teacher Details',
  },
  {
    path: 'student-financials',
    loadComponent: () => import('./finance/student-financials/student-financials-dashboard/student-financials-dashboard.component').then(m => m.StudentFinancialsDashboardComponent),
    canActivate: [AuthGuardService],
    title: 'Student Financials',
    loadChildren: () => import('./finance/student-financials/student-financials.routes').then(m => m.STUDENT_FINANCIALS_ROUTES),
  },
  {
    path: 'students',
    component: StudentsListComponent,
    canActivate: [AuthGuardService],
    title: 'Manage Students',
  },
  {
    path: 'student-view/:studentNumber',
    component: StudentViewComponent,
    canActivate: [AuthGuardService],
    title: 'Student Details',
  },
  {
    path: 'classes',
    component: ClassesComponent,
    canActivate: [AuthGuardService],
    title: 'Manage Classes',
  },
  {
    path: 'terms',
    component: TermsComponent,
    canActivate: [AuthGuardService],
    title: 'Manage Terms',
  },
  {
    path: 'enrol',
    component: TermsClassesComponent,
    canActivate: [AuthGuardService],
    title: 'Enrol Students',
  },
  {
    path: 'class-lists',
    component: ClassListsComponent,
    canActivate: [AuthGuardService],
    title: 'Class Lists',
  },
  {
    path: 'migrate-class',
    component: MigrateClassEnrolmentComponent,
    canActivate: [AuthGuardService],
    title: 'Migrate Class Enrolment',
  },
  {
    path: 'subjects',
    component: SubjectsComponent,
    canActivate: [AuthGuardService],
    title: 'Manage Subjects',
  },
  {
    path: 'input',
    component: EnterMarksComponent,
    canActivate: [AuthGuardService],
    title: 'Enter Marks',
  },
  {
    path: 'marks-progress',
    component: MarksProgressComponent,
    canActivate: [AuthGuardService],
    title: 'Marks Capture Progress',
  },
  {
    path: 'mark-sheets',
    component: MarksSheetsComponent,
    canActivate: [AuthGuardService],
    title: 'Mark Sheets',
  },
  {
    path: 'marks/continuous',
    loadComponent: () =>
      import('./marks/continuous-assessment/continuous-assessment.component').then(
        (m) => m.ContinuousAssessmentComponent,
      ),
    canActivate: [AuthGuardService],
    title: 'Continuous Assessment',
  },

  {
    path: 'reports',
    component: ReportsComponent,
    canActivate: [AuthGuardService],
    title: 'Progress Reports',
  },
  {
    path: 'mark-register',
    component: MarkRegisterComponent,
    canActivate: [AuthGuardService],
    title: 'Mark Attendance Register',
  },
  {
    path: 'attendance-reports',
    component: AttendanceReportsComponent,
    canActivate: [AuthGuardService],
    title: 'Attendance Reports',
  },
  {
    path: 'teachers-comments',
    component: TeachersCommentsComponent,
    canActivate: [AuthGuardService],
    title: 'Teacher Comments',
  },
  {
    path: 'results-analysis',
    component: ResultsAnalysisComponent,
    canActivate: [AuthGuardService],
    title: 'Results Analysis',
  },
  {
    path: 'fees',
    loadComponent: () => import('./finance/fees/fees.component').then(m => m.FeesComponent),
    canActivate: [AuthGuardService],
    title: 'Manage Fees',
  },
  {
    path: 'invoice',
    loadComponent: () => import('./finance/student-finance/invoice/invoice.component').then(m => m.InvoiceComponent),
    canActivate: [AuthGuardService],
    title: 'Invoice Management',
  },
  {
    path: 'student-finance',
    loadComponent: () => import('./finance/student-finance/student-finance.component').then(m => m.StudentFinanceComponent),
    canActivate: [AuthGuardService],
    title: 'Individual Student Finance',
  },
  {
    path: 'payments',
    loadComponent: () => import('./finance/payments/payments.component').then(m => m.PaymentsComponent),
    canActivate: [AuthGuardService],
    title: 'Receipting',
  },
  {
    path: 'exemptions',
    loadComponent: () => import('./finance/exemptions/exemptions.component').then(m => m.ExemptionsComponent),
    canActivate: [AuthGuardService],
    title: 'Exemption Management',
  },
  {
    canActivate: [AuthGuardService],
    path: 'student-ledger',
    loadComponent: () => import('./finance/reports/student-ledger-report/student-ledger-report.component').then(m => m.StudentLedgerReportComponent),
    title: 'Student Ledger Reports',
  },
  {
    canActivate: [AuthGuardService],
    path: 'fees-collection',
    component: FeesCollectionReportComponent,
    title: 'Fees Collection Report',
  },
  {
    canActivate: [AuthGuardService],
    path: 'outstanding-fees',
    loadComponent: () => import('./finance/reports/outstanding-fees-report/outstanding-fees-report.component').then(m => m.OutstandingFeesReportComponent),
    title: 'Outstanding Fees Report',
  },
  {
    canActivate: [AuthGuardService],
    path: 'exemption-reports',
    component: ExemptionReportsComponent,
    title: 'Exemption Reports',
  },
  {
    canActivate: [AuthGuardService],
    path: 'aged-debtors',
    loadComponent: () => import('./finance/reports/aged-debtors-report/aged-debtors-report.component').then(m => m.AgedDebtorsReportComponent),
    title: 'Aged Debtors Report',
  },
  {
    canActivate: [AuthGuardService],
    path: 'enrollment-billing-reconciliation',
    loadComponent: () => import('./finance/reports/enrollment-billing-reconciliation-report/enrollment-billing-reconciliation-report.component').then(m => m.EnrollmentBillingReconciliationReportComponent),
    title: 'Enrollment vs. Billing Reconciliation',
  },
  {
    canActivate: [AuthGuardService],
    path: 'revenue-recognition',
    component: RevenueRecognitionReportComponent,
    title: 'Revenue Recognition',
  },
  {
    canActivate: [AuthGuardService],
    path: 'student-reconciliation',
    loadComponent: () => import('./finance/reports/student-reconciliation/student-reconciliation.component').then(m => m.StudentReconciliationComponent),
    title: 'Student Finance Reconciliation',
  },
  {
    path: 'user-management',
    loadChildren: () => import('./user-management/user-management.module').then(m => m.UserManagementModule),
    canActivate: [AuthGuardService],
    title: 'User Management',
  },
  {
    path: 'system/roles',
    loadComponent: () => import('./system/roles-permissions/roles-permissions.component').then(m => m.RolesPermissionsComponent),
    canActivate: [AuthGuardService],
    title: 'Roles & Permissions',
  },
  {
    path: 'system/academic',
    loadComponent: () => import('./system/academic-settings/academic-settings.component').then(m => m.AcademicSettingsComponent),
    canActivate: [AuthGuardService],
    title: 'Academic Settings',
  },
  {
    path: 'system/settings',
    loadComponent: () => import('./system/system-settings/system-settings.component').then(m => m.SystemSettingsComponent),
    canActivate: [AuthGuardService],
    title: 'System Settings',
  },
  {
    path: 'system/audit',
    loadComponent: () => import('./system/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent),
    canActivate: [AuthGuardService],
    title: 'Audit Logs',
  },
  {
    path: 'system/analytics',
    loadComponent: () => import('./system/analytics/analytics.component').then(m => m.AnalyticsComponent),
    canActivate: [AuthGuardService],
    title: 'Analytics & Reports',
  },
  {
    path: 'system/integrations',
    loadComponent: () => import('./system/integrations/integrations.component').then(m => m.IntegrationsComponent),
    canActivate: [AuthGuardService],
    title: 'Integrations',
  },
  {
    path: 'calendar',
    loadComponent: () => import('./system/calendar/calendar.component').then(m => m.CalendarComponent),
    canActivate: [AuthGuardService],
    title: 'Calendar',
  },
  {
    path: 'messaging',
    loadComponent: () => import('./messaging/messaging.component').then(m => m.MessagingComponent),
    canActivate: [AuthGuardService],
    title: 'Messages',
  },
  {
    path: 'messaging/:id',
    loadComponent: () => import('./messaging/messaging.component').then(m => m.MessagingComponent),
    canActivate: [AuthGuardService],
    title: 'Messages',
  },
  {
    path: '', // Default route for the root path
    redirectTo: 'signin',
    pathMatch: 'full',
  },
  {
    path: '**', // Wildcard route for any unmatched paths
    // Redirect to 'signin' if any unknown route is hit.
    // This prevents hitting guarded routes when not logged in.
    redirectTo: 'signin',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
