import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  getAssessment,
  listAssessmentQuestions,
  updateAssessment,
  type AssessmentSummary,
  type QuestionSummary,
} from '../../api/assessments';
import { ApiError } from '../../api/http';

export function EditAssessmentPage() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState<AssessmentSummary | null>(null);
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      setError('Falta el identificador del reto.');
      return;
    }

    const controller = new AbortController();
    Promise.all([
      getAssessment(assessmentId, controller.signal),
      listAssessmentQuestions(assessmentId, controller.signal),
    ])
      .then(([loadedAssessment, loadedQuestions]) => {
        setAssessment(loadedAssessment);
        setQuestions(loadedQuestions);
        setName(loadedAssessment.name);
        setDescription(loadedAssessment.description);
        setDurationMinutes(String(loadedAssessment.durationMinutes));
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof ApiError ? reason.message : 'No fue posible cargar el reto.');
      });
    return () => controller.abort();
  }, [assessmentId]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!assessmentId) return;

    setSubmitting(true);
    setError(null);
    try {
      await updateAssessment(assessmentId, {
        name,
        description,
        durationMinutes: Number(durationMinutes),
      });
      navigate('/admin');
    } catch (reason: unknown) {
      setError(reason instanceof ApiError ? reason.message : 'No fue posible guardar los cambios.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !assessment) {
    return <section className="admin-form-page"><Link className="back-link" to="/admin">← Volver a administración</Link><div className="status-panel error-panel" role="alert"><span className="status-symbol">!</span><div><h1>El reto no está disponible</h1><p>{error}</p></div></div></section>;
  }

  if (!assessment) {
    return <section className="admin-form-page" aria-busy="true"><span className="skeleton skeleton-editor-title" /><span className="skeleton skeleton-results-body" /></section>;
  }

  return (
    <section className="admin-form-page" aria-labelledby="edit-assessment-title">
      <Link className="back-link" to="/admin">← Volver a administración</Link>
      <header><h1 id="edit-assessment-title">Edita el reto</h1><p>Actualiza la información general y administra sus ejercicios.</p></header>
      <form className="admin-form" aria-busy={submitting} onSubmit={submit}>
        <label>Nombre del reto<input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></label>
        <label className="full-width">Descripción<textarea required minLength={10} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        <label>Duración en minutos<input required min={1} type="number" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>
        <p className="form-note full-width">Estado actual: {assessment.status === 'PUBLISHED' ? 'Publicado' : assessment.status === 'DRAFT' ? 'Borrador' : 'Archivado'}.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><Link className="open-link" to="/admin">Cancelar</Link><button className="admin-primary-action" disabled={submitting} type="submit">{submitting ? <><span className="button-spinner" aria-hidden="true" />Guardando…</> : 'Guardar cambios'}</button></div>
      </form>

      <section className="embedded-question-management" aria-labelledby="assessment-questions-title">
        <div className="admin-list-heading">
          <div><h2 id="assessment-questions-title">Ejercicios</h2></div>
          {assessment.status === 'DRAFT' ? (
            <Link className="admin-primary-action" to={`/admin/assessments/${assessment.id}/questions/new`}>Agregar ejercicio <span aria-hidden="true">+</span></Link>
          ) : null}
        </div>
        {assessment.status !== 'DRAFT' ? <p className="form-note">Los ejercicios publicados solo se pueden modificar mientras no tengan resultados evaluados.</p> : null}
        {questions.length === 0 ? (
          <div className="status-panel">
            <span className="status-symbol" aria-hidden="true">+</span>
            <div><h2>Aún no hay ejercicios</h2><p>Agrega el primero antes de publicar este reto.</p></div>
          </div>
        ) : (
          <div className="question-management-list" aria-label="Ejercicios configurados">
            {questions.map((question) => (
              <article className="question-management-row" key={question.id}>
                <span className="question-management-position">{String(question.position).padStart(2, '0')}</span>
                <div><h2>{question.title}</h2><p>{question.description}</p><small>{question.allowedLanguages.join(' · ')} · {question.testCases.length} casos de prueba</small></div>
                <Link className="open-link" to={`/admin/assessments/${assessment.id}/questions/${question.id}/edit`}>Editar ejercicio</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
