import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { AssessmentDetailPage } from './features/assessments/AssessmentDetailPage';
import { AssessmentListPage } from './features/assessments/AssessmentListPage';
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { CreateAssessmentPage } from './features/admin/CreateAssessmentPage';
import { CreateQuestionPage } from './features/admin/CreateQuestionPage';
import { HomePage } from './features/home/HomePage';
import { RoleProvider } from './features/roles/RoleContext';

const ExerciseEditorPage = lazy(() =>
  import('./features/editor/ExerciseEditorPage').then(({ ExerciseEditorPage: page }) => ({
    default: page,
  })),
);

const SubmissionResultsPage = lazy(() =>
  import('./features/results/SubmissionResultsPage').then(({ SubmissionResultsPage: page }) => ({
    default: page,
  })),
);

const AssessmentResultsPage = lazy(() =>
  import('./features/results/AssessmentResultsPage').then(({ AssessmentResultsPage: page }) => ({
    default: page,
  })),
);

export function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route element={<AppLayout />}>
          <Route path="/assessments" element={<AssessmentListPage />} />
          <Route path="/assessments/:id" element={<AssessmentDetailPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/assessments/new" element={<CreateAssessmentPage />} />
          <Route path="/admin/assessments/:assessmentId/questions/new" element={<CreateQuestionPage />} />
          <Route
            path="/assessments/:assessmentId/questions/:questionId/editor"
            element={
                <Suspense fallback={<section className="route-loading">Cargando editor…</section>}>
                <ExerciseEditorPage />
              </Suspense>
            }
          />
          <Route
            path="/assessments/:assessmentId/submissions/:submissionId/results"
            element={
                <Suspense fallback={<section className="route-loading">Cargando resultados…</section>}>
                <SubmissionResultsPage />
              </Suspense>
            }
          />
          <Route
            path="/assessments/:assessmentId/attempts/:attemptId/results"
            element={
                <Suspense fallback={<section className="route-loading">Cargando resultados del assessment…</section>}>
                <AssessmentResultsPage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  );
}
