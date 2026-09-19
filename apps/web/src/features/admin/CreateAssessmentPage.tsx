import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { createAssessment } from '../../api/assessments';
import { ApiError } from '../../api/http';

function toSlug(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function CreateAssessmentPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const assessment = await createAssessment({
        name,
        slug: slug || toSlug(name),
        description,
        durationMinutes: Number(durationMinutes),
      });
      navigate(`/admin/assessments/${assessment.id}/questions/new`);
    } catch (requestError: unknown) {
      setError(requestError instanceof ApiError ? requestError.message : 'No fue posible crear el reto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="admin-form-page" aria-labelledby="create-assessment-title">
      <Link className="back-link" to="/admin">← Volver a administración</Link>
      <header><p className="section-kicker">Paso 1 · Reto</p><h1 id="create-assessment-title">Define el reto</h1><p>Comienza con la información que verá el candidato antes de abrir el editor.</p></header>
      <form className="admin-form" onSubmit={submit}>
        <label>Nombre del reto<input required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej.: Fundamentos de backend" /></label>
        <label>Slug<input required maxLength={100} value={slug} onChange={(event) => setSlug(toSlug(event.target.value))} placeholder="backend-foundations" /></label>
        <label className="full-width">Descripción<textarea required minLength={10} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe las habilidades y el formato que evalúa este reto." /></label>
        <label>Duración en minutos<input required min={1} type="number" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} /></label>
        <p className="form-note full-width">El reto se guardará como borrador. Podrás publicarlo cuando tenga al menos un ejercicio y sus casos de prueba.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions"><Link className="open-link" to="/admin">Cancelar</Link><button className="admin-primary-action" disabled={submitting} type="submit">{submitting ? 'Creando…' : 'Continuar a ejercicios'} <span aria-hidden="true">→</span></button></div>
      </form>
    </section>
  );
}
