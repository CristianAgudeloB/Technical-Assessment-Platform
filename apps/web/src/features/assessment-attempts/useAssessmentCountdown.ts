import { useEffect, useMemo, useState } from 'react';
import type { AssessmentAttempt } from '../../api/assessment-attempts';

export function useAssessmentCountdown(attempt: AssessmentAttempt | null) {
  const serverOffsetMs = useMemo(() => {
    if (!attempt) return 0;
    return new Date(attempt.serverTime).getTime() - Date.now();
  }, [attempt?.id, attempt?.serverTime]);
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(attempt, serverOffsetMs));

  useEffect(() => {
    const update = () => setRemainingMs(getRemainingMs(attempt, serverOffsetMs));
    update();

    if (!attempt || attempt.status !== 'ACTIVE') return;

    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, [attempt, serverOffsetMs]);

  return {
    isExpired: attempt?.status === 'EXPIRED' || remainingMs <= 0,
    isCompleted: attempt?.status === 'COMPLETED',
    remainingMs,
    label: formatRemainingTime(remainingMs),
  };
}

function getRemainingMs(attempt: AssessmentAttempt | null, serverOffsetMs: number) {
  if (!attempt || attempt.status !== 'ACTIVE') return 0;
  return Math.max(0, new Date(attempt.expiresAt).getTime() - (Date.now() + serverOffsetMs));
}

function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.ceil(remainingMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
