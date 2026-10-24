import type { Issue, Severity } from '../domain/types';

export const SCORE_DEDUCTIONS: Record<Severity, number> = {
  critical: 25,
  high: 15,
  medium: 7,
  low: 3,
};

/**
 * Deterministic gamified merit score. This is explicitly NOT a security
 * certification and is only derived from the rules that actually produced
 * issues.
 */
export function calculateScore(issues: Pick<Issue, 'severity'>[]): number {
  const deduction = issues.reduce(
    (sum, issue) => sum + (SCORE_DEDUCTIONS[issue.severity] ?? 0),
    0,
  );
  return Math.max(0, 100 - deduction);
}

export interface ScoreTier {
  label: string;
  description: string;
}

export function getScoreTier(score: number): ScoreTier {
  if (score >= 90) {
    return {
      label: '功德深厚',
      description: '阴德尚存，仍需敬畏规则。',
    };
  }
  if (score >= 70) {
    return {
      label: '尚可还阳',
      description: '小罪在册，修补后可回人间。',
    };
  }
  if (score >= 40) {
    return {
      label: '罪孽深重',
      description: '怨气缠身，速速改码赎罪。',
    };
  }
  return {
    label: '怨气冲天',
    description: '此码业障极重，建议回炉重造。',
  };
}