import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { AssessmentDetailPage } from './features/assessments/AssessmentDetailPage';
import { AssessmentListPage } from './features/assessments/AssessmentListPage';
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { CreateAssessmentPage } from './features/admin/CreateAssessmentPage';
import { EditAssessmentPage } from './features/admin/EditAssessmentPage';
import { EditQuestionPage } from './features/admin/EditQuestionPage';
import { CreateQuestionPage } from './features/admin/CreateQuestionPage';
import { AssignmentPage } from './features/admin/AssignmentPage';
import { AdminResultsPage } from './features/admin/AdminResultsPage';
import { AdminResultDetailPage } from './features/admin/AdminResultDetailPage';
import { AuthPage } from './features/auth/AuthPage';
import { AuthProvider } from './features/auth/AuthContext';
import { RequireAuth, RequireRole } from './features/auth/RequireAuth';

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

function AssessmentQuestionsRedirect() {
  const { assessmentId } = useParams();

  return <Navigate replace to={assessmentId ? `/admin/assessments/${assessmentId}/edit` : '/admin'} />;
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/assessments" element={<RequireRole role="CANDIDATE"><AssessmentListPage /></RequireRole>} />
              <Route path="/assessments/:id" element={<RequireRole role="CANDIDATE"><AssessmentDetailPage /></RequireRole>} />
              <Route path="/admin" element={<RequireRole role="ADMIN"><AdminDashboardPage /></RequireRole>} />
              <Route path="/admin/assignments" element={<RequireRole role="ADMIN"><AssignmentPage /></RequireRole>} />
              <Route path="/admin/results" element={<RequireRole role="ADMIN"><AdminResultsPage /></RequireRole>} />
              <Route path="/admin/results/:attemptId" element={<RequireRole role="ADMIN"><AdminResultDetailPage /></RequireRole>} />
              <Route path="/admin/assessments/new" element={<RequireRole role="ADMIN"><CreateAssessmentPage /></RequireRole>} />
              <Route path="/admin/assessments/:assessmentId/edit" element={<RequireRole role="ADMIN"><EditAssessmentPage /></RequireRole>} />
              <Route path="/admin/assessments/:assessmentId/questions" element={<AssessmentQuestionsRedirect />} />
              <Route path="/admin/assessments/:assessmentId/questions/new" element={<RequireRole role="ADMIN"><CreateQuestionPage /></RequireRole>} />
              <Route path="/admin/assessments/:assessmentId/questions/:questionId/edit" element={<RequireRole role="ADMIN"><EditQuestionPage /></RequireRole>} />
              <Route
                path="/assessments/:assessmentId/questions/:questionId/editor"
                element={
                  <RequireRole role="CANDIDATE">
                    <Suspense fallback={<section className="route-loading">Cargando editor…</section>}>
                      <ExerciseEditorPage />
                    </Suspense>
                  </RequireRole>
                }
              />
              <Route
                path="/assessments/:assessmentId/submissions/:submissionId/results"
                element={
                  <RequireRole role="CANDIDATE">
                    <Suspense fallback={<section className="route-loading">Cargando resultados…</section>}>
                      <SubmissionResultsPage />
                    </Suspense>
                  </RequireRole>
                }
              />
              <Route
                path="/assessments/:assessmentId/attempts/:attemptId/results"
                element={
                  <RequireRole role="CANDIDATE">
                    <Suspense fallback={<section className="route-loading">Cargando resultados del assessment…</section>}>
                      <AssessmentResultsPage />
                    </Suspense>
                  </RequireRole>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
