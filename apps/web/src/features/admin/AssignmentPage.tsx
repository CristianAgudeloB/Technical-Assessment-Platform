import { useEffect, useMemo, useState } from 'react';
import { ApiError } from '../../api/http';
import {
  assignAssessment,
  type AssessmentAssignment,
  type Candidate,
  listCandidateAssignments,
  listCandidates,
  unassignAssessment,
} from '../../api/assignments';
import { type AssessmentSummary, listAssessments } from '../../api/assessments';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; candidates: Candidate[]; assessments: AssessmentSummary[] }
  | { kind: 'error'; message: string };

type AssignmentAction = 'assign' | 'update' | 'unassign';

function toDateTimeLocal(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function defaultAvailableUntil() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return toDateTimeLocal(date);
}

function formatAvailability(value: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function availabilityLabel(assignment: AssessmentAssignment) {
  const now = Date.now();
  if (new Date(assignment.availableFrom).getTime() > now) return 'Programado';
  if (new Date(assignment.availableUntil).getTime() <= now) return 'Vencido';
  return 'Asignado';
}

export function AssignmentPage() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [candidateId, setCandidateId] = useState('');
  const [candidateQuery, setCandidateQuery] = useState('');
  const [assignments, setAssignments] = useState<AssessmentAssignment[]>([]);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [processing, setProcessing] = useState<{ assessmentId: string; action: AssignmentAction } | null>(null);
  const [availableFrom, setAvailableFrom] = useState(() => toDateTimeLocal(new Date()));
  const [availableUntil, setAvailableUntil] = useState(defaultAvailableUntil);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([listCandidates(controller.signal), listAssessments(controller.signal)])
      .then(([candidates, assessments]) => {
        setState({ kind: 'ready', candidates, assessments });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setState({ kind: 'error', message: getErrorMessage(reason, 'No fue posible cargar las asignaciones.') });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!candidateId) {
      setAssignments([]);
      setIsAssignmentsLoading(false);
      return;
    }

    const controller = new AbortController();
    setError(null);
    setAssignments([]);
    setIsAssignmentsLoading(true);
    listCandidateAssignments(candidateId, controller.signal)
      .then(setAssignments)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(getErrorMessage(reason, 'No fue posible consultar los retos asignados.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsAssignmentsLoading(false);
      });
    return () => controller.abort();
  }, [candidateId]);

  const assignmentsByAssessmentId = useMemo(
    () => new Map(assignments.map((assignment) => [assignment.assessmentId, assignment])),
    [assignments],
  );
  const selectedCandidate = state.kind === 'ready'
    ? state.candidates.find((candidate) => candidate.id === candidateId) ?? null
    : null;
  const visibleCandidates = state.kind === 'ready'
    ? candidateQuery.trim() ? state.candidates.filter((candidate) => matchesCandidate(candidate, candidateQuery)) : []
    : [];
  const publishedAssessments = state.kind === 'ready'
    ? state.assessments.filter((assessment) => assessment.status === 'PUBLISHED')
    : [];

  const assign = async (assessmentId: string, isUpdate = false) => {
    if (!candidateId) return;
    const startsAt = new Date(availableFrom);
    const endsAt = new Date(availableUntil);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
      setError('La fecha de finalización debe ser posterior a la fecha de inicio.');
      return;
    }

    setProcessing({ assessmentId, action: isUpdate ? 'update' : 'assign' });
    setError(null);
    try {
      const assignment = await assignAssessment(
        candidateId,
        assessmentId,
        startsAt.toISOString(),
        endsAt.toISOString(),
      );
      setAssignments((current) => [
        assignment,
        ...current.filter(({ assessmentId: id }) => id !== assessmentId),
      ]);
    } catch (reason) {
      setError(getErrorMessage(reason, 'No fue posible asignar el reto.'));
    } finally {
      setProcessing(null);
    }
  };

  const unassign = async (assessmentId: string) => {
    if (!candidateId) return;
    setProcessing({ assessmentId, action: 'unassign' });
    setError(null);
    try {
      await unassignAssessment(candidateId, assessmentId);
      setAssignments((current) => current.filter(({ assessmentId: id }) => id !== assessmentId));
    } catch (reason) {
      setError(getErrorMessage(reason, 'No fue posible desasignar el reto.'));
    } finally {
      setProcessing(null);
    }
  };

  return (
    <section className="assignment-page" aria-labelledby="assignment-title">
      <header className="admin-heading">
        <div>
          <h1 id="assignment-title">Asignación de retos</h1>
          <p>Selecciona un candidato y asigna los retos publicados que debe resolver.</p>
        </div>
      </header>

      {state.kind === 'loading' && <div className="assignment-loading"><span className="skeleton" /></div>}
      {state.kind === 'error' && <StatusError message={state.message} />}

      {state.kind === 'ready' && state.candidates.length === 0 && (
        <div className="status-panel">
          <span className="status-symbol" aria-hidden="true">+</span>
          <div><h2>Aún no hay candidatos</h2><p>Cuando alguien se registre, estará disponible aquí para asignarle retos.</p></div>
        </div>
      )}

      {state.kind === 'ready' && state.candidates.length > 0 && (
        <div className="assignment-workspace" aria-busy={isAssignmentsLoading || processing !== null}>
          <aside className="candidate-picker" aria-label="Seleccionar candidato">
            <label>
              Buscar candidato
              <input
                onChange={(event) => setCandidateQuery(event.target.value)}
                placeholder="Nombre o correo"
                type="search"
                value={candidateQuery}
              />
            </label>
            {candidateQuery.trim() && <div className="candidate-search-results" aria-label="Resultados de candidatos" role="list">
              {visibleCandidates.map((candidate) => {
                const isSelected = candidate.id === candidateId;
                return (
                  <button
                    aria-pressed={isSelected}
                    className={`candidate-search-option${isSelected ? ' selected' : ''}`}
                    key={candidate.id}
                    onClick={() => {
                      setCandidateId(candidate.id);
                      setCandidateQuery('');
                    }}
                    type="button"
                  >
                    <strong>{candidate.displayName}</strong>
                    <span>{candidate.email}</span>
                  </button>
                );
              })}
              {visibleCandidates.length === 0 && <p className="candidate-search-empty">No encontramos candidatos con esa búsqueda.</p>}
            </div>}
            {selectedCandidate && <div className="assignment-candidate-summary">
              <p className="candidate-email"><strong>{selectedCandidate.displayName}</strong><span>{selectedCandidate.email}</span></p>
              {isAssignmentsLoading ? <p className="assignment-selection-loading" role="status"><span className="button-spinner" aria-hidden="true" />Cargando retos asignados…</p> : <p className="assignment-count"><strong>{assignments.length}</strong> retos asignados</p>}
            </div>}
            {selectedCandidate && <div className="assignment-availability-range">
              <strong>Periodo de disponibilidad</strong>
              <div>
                <label>
                  Disponible desde
                  <input
                    max={availableUntil}
                    onChange={(event) => setAvailableFrom(event.target.value)}
                    type="datetime-local"
                    value={availableFrom}
                  />
                </label>
                <label>
                  Disponible hasta
                  <input
                    min={availableFrom}
                    onChange={(event) => setAvailableUntil(event.target.value)}
                    type="datetime-local"
                    value={availableUntil}
                  />
                </label>
              </div>
              <small>El candidato solo verá el reto dentro de este periodo.</small>
            </div>}
          </aside>

          <section className="assignment-catalogue" aria-labelledby="assignment-catalogue-title">
            <div className="admin-list-heading">
              <div><h2 id="assignment-catalogue-title">Disponible para asignar</h2></div>
              <span>{publishedAssessments.length} en total</span>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {publishedAssessments.length === 0 && <div className="status-panel"><span className="status-symbol">!</span><div><h2>No hay retos publicados</h2><p>Publica un reto antes de asignarlo.</p></div></div>}
            <div className="assignment-list">
              {publishedAssessments.map((assessment) => {
                const assignment = assignmentsByAssessmentId.get(assessment.id);
                const assigned = Boolean(assignment);
                const rowProcessing = processing?.assessmentId === assessment.id;
                return (
                  <article className="assignment-row" key={assessment.id}>
                    <div>
                      <h3>{assessment.name}</h3><p>{assessment.description}</p><small>{assessment.durationMinutes} min</small>
                      {assignment && <small className="assignment-availability">{availabilityLabel(assignment)} · {formatAvailability(assignment.availableFrom)} — {formatAvailability(assignment.availableUntil)}</small>}
                    </div>
                    {assigned ? (
                      <div className="assignment-actions">
                        <span className="assigned-label">{availabilityLabel(assignment!)}</span>
                        <button
                          className="unassign-button"
                          aria-busy={rowProcessing}
                          disabled={isAssignmentsLoading || processing !== null}
                          onClick={() => assign(assessment.id, true)}
                          type="button"
                        >
                          {rowProcessing && processing?.action === 'update' ? <><span className="button-spinner" aria-hidden="true" />Actualizando…</> : 'Actualizar fechas'}
                        </button>
                        <button
                          className="unassign-button"
                          aria-busy={rowProcessing}
                          disabled={isAssignmentsLoading || processing !== null}
                          onClick={() => unassign(assessment.id)}
                          type="button"
                        >
                          {rowProcessing && processing?.action === 'unassign' ? <><span className="button-spinner" aria-hidden="true" />Desasignando…</> : 'Desasignar'}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="assign-button"
                        aria-busy={rowProcessing}
                        disabled={isAssignmentsLoading || processing !== null || !candidateId}
                        onClick={() => assign(assessment.id)}
                        type="button"
                      >
                        {rowProcessing && processing?.action === 'assign' ? <><span className="button-spinner" aria-hidden="true" />Asignando…</> : isAssignmentsLoading ? 'Cargando retos…' : candidateId ? 'Asignar reto' : 'Busca un candidato'}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function StatusError({ message }: { message: string }) {
  return <div className="status-panel error-panel" role="alert"><span className="status-symbol">!</span><div><h2>Las asignaciones no están disponibles</h2><p>{message}</p></div></div>;
}

function getErrorMessage(reason: unknown, fallback: string) {
  return reason instanceof ApiError ? reason.message : fallback;
}

function matchesCandidate(candidate: Candidate, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  return `${candidate.displayName} ${candidate.email}`.toLocaleLowerCase().includes(normalizedQuery);
}
