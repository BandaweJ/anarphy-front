import { createReducer, on } from '@ngrx/store';
import { ReportsModel } from '../models/reports.model';
import * as reportsActions from './reports.actions';
import { ReportModel } from '../models/report.model';

export interface State {
  reports: ReportsModel[];
  studentReports: ReportsModel[];
  selectedReport: ReportsModel | null;
  isLoading: boolean;
  isLoaded: boolean;
  errorMessage: string;
  viewReportsError: string;
}

export const initialState: State = {
  reports: [],
  studentReports: [],
  selectedReport: null,
  isLoading: false,
  isLoaded: false,
  errorMessage: '',
  viewReportsError: '',
};

export const reportsReducer = createReducer(
  initialState,
  on(reportsActions.generateReports, (state) => ({
    ...state,
    isLoading: true,
  })),
  on(reportsActions.generateReportsSuccess, (state, { reports }) => ({
    ...state,
    reports,
    isLoading: false,
  })),
  on(reportsActions.generateReportsFail, (state, { error }) => ({
    ...state,
    isLoading: false,
    errorMessage: error.message,
  })),
  on(reportsActions.saveReportActions.saveReports, (state) => ({
    ...state,
    isLoading: true,
    reports: [],
  })),
  on(
    reportsActions.saveReportActions.saveReportsSuccess,
    (state, { reports }) => ({
      ...state,
      isLoading: false,
      reports: [...reports],
    })
  ),
  on(reportsActions.saveReportActions.saveReportsFail, (state, { error }) => ({
    ...state,
    isLoading: false,
    errorMessage: error.message,
  })),
  on(reportsActions.viewReportsActions.viewReports, (state) => ({
    ...state,
    isLoading: true,
    isLoaded: false,
    reports: [],
  })),
  on(
    reportsActions.viewReportsActions.viewReportsSuccess,
    (state, { reports }) => ({
      ...state,
      isLoading: false,
      isLoaded: true,
      reports: [...reports],
    })
  ),
  on(reportsActions.viewReportsActions.viewReportsFail, (state, { error }) => ({
    ...state,
    isLoading: false,
    isLoaded: false,
    errorMessage: error.message,
    reports: [],
  })),
  on(
    reportsActions.saveHeadCommentActions.saveHeadComment,
    (state, { comment }) => ({
      ...state,
      // isLoading: true,
    })
  ),
  on(
    reportsActions.saveHeadCommentActions.saveHeadCommentSuccess,
    (state, { report }) => ({
      ...state,
      // isLoading: false,
      reports: [
        ...state.reports.map((rep) =>
          rep.studentNumber === report.studentNumber
            ? (rep = report)
            : (rep = rep)
        ),
      ],
      selectedReport: state.selectedReport?.studentNumber === report.studentNumber
        ? report
        : state.selectedReport,
    })
  ),
  on(
    reportsActions.saveHeadCommentActions.saveHeadCommentFail,
    (state, { error }) => ({
      ...state,
      // isLoading: false,
      errorMessage: error.message,
    })
  ),
  on(
    reportsActions.saveFormTeacherCommentActions.saveFormTeacherComment,
    (state, { comment }) => ({
      ...state,
      // isLoading: true,
    })
  ),
  on(
    reportsActions.saveFormTeacherCommentActions.saveFormTeacherCommentSuccess,
    (state, { report }) => ({
      ...state,
      // isLoading: false,
      reports: [
        ...state.reports.map((rep) =>
          rep.studentNumber === report.studentNumber
            ? (rep = report)
            : (rep = rep)
        ),
      ],
      selectedReport: state.selectedReport?.studentNumber === report.studentNumber
        ? report
        : state.selectedReport,
    })
  ),
  on(
    reportsActions.saveFormTeacherCommentActions.saveFormTeacherCommentFail,
    (state, { error }) => ({
      ...state,
      // isLoading: false,
      errorMessage: error.message,
    })
  ),
  on(reportsActions.generatePdfActions.generatePdf, (state) => ({
    ...state,
    isLoading: true,
  })),
  on(reportsActions.generatePdfActions.generatePdfSuccess, (state) => ({
    ...state,
    isLoading: false,
  })),
  on(reportsActions.viewReportsActions.fetchStudentReports, (state) => ({
    ...state,
    isLoading: true,
    isLoaded: false,
    errorMessage: '',
    reports: [],
    selectedReport: null,
  })),
  on(
    reportsActions.viewReportsActions.fetchStudentReportsSuccess,
    (state, { reports }) => ({
      ...state,
      isLoading: false,
      isLoaded: true,
      errorMessage: '',
      reports: [],
      studentReports: [...reports],
      selectedReport: null,
    })
  ),
  on(
    reportsActions.viewReportsActions.fetchStudentReportsFail,
    (state, { error }) => ({
      ...state,
      isLoading: false,
      isLoaded: false,
      errorMessage: error.message,
      reports: [],
      studentReports: [],
      selectedReport: null,
    })
  ),
  on(
    reportsActions.viewReportsActions.selectStudentReport,
    (state, { report }) => ({
      ...state,
      selectedReport: report, // Set the selected report for display
      errorMessage: '', // Clear any previous error
    })
  ),
  on(reportsActions.viewReportsActions.clearSelectedReport, (state) => ({
    ...state,
    selectedReport: null, // Clear the currently displayed report
    errorMessage: '', // Clear any previous error
  })),
  on(reportsActions.viewReportsActions.resetReports, (state) => ({
    ...state,
    reports: [],
  })),
  // --- YOUR NEW REDUCER HANDLER IS HERE ---
  on(
    reportsActions.viewReportsActions.setReportsErrorMsg,
    (state, { errorMsg }) => ({
      ...state,
      errorMessage: errorMsg,
    })
  )
  // on(reportsActions.saveHeadCommentActions.saveHeadCommentSuccess, (state))
);
