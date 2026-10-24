export type JudgeType = 'black' | 'white' | 'judge';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type Confidence = 'confirmed' | 'suspected';

export type IssueSource = 'rule' | 'ai';

export type Language = 'javascript' | 'typescript';

export interface ScanInput {
  filename: string;
  language: Language;
  source: string;
}

export interface Issue {
  id: string;
  judge: JudgeType;
  ruleId: string;
  crime: string;
  title: string;
  severity: Severity;
  file: string;
  /** 1-based line number in the submitted source. */
  line: number;
  /** Original source text at `line`, trimmed; always present in the source. */
  evidence: string;
  explanation: string;
  suggestion: string;
  confidence: Confidence;
  source: IssueSource;
}

export interface JudgeSummary {
  judge: JudgeType;
  count: number;
  issues: Issue[];
  verdict: string;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Judgment {
  id: string;
  filename: string;
  language: Language;
  issues: Issue[];
  score: number;
  severityCounts: SeverityCounts;
  judges: Record<JudgeType, JudgeSummary>;
  yamaVerdict: string;
  createdAt: string;
  engineVersion: string;
  scannedLines: number;
  truncated: boolean;
}

export interface Patch {
  id: string;
  issueId: string;
  title: string;
  rationale: string;
  before: string;
  after: string;
  startLine: number;
  endLine: number;
}

export type VerificationStatus = 'pass' | 'fail' | 'not-run';

export interface VerificationResult {
  syntax: VerificationStatus;
  rules: VerificationStatus;
  unitTests: 'not-run';
  messages: string[];
  passed: boolean;
  remaining: Issue[];
}

export interface DemoCase {
  id: string;
  name: string;
  filename: string;
  language: Language;
  tagline: string;
  description: string;
  badge: string;
  source: string;
}

export type Phase = 'gate' | 'judging' | 'verdict';

export interface LocateRequest {
  line: number;
  nonce: number;
}

export interface AiFinding extends Issue {
  source: 'ai';
}

export type AiStatus = 'idle' | 'disabled' | 'loading' | 'ok' | 'fallback';

export const JUDGE_LABELS: Record<JudgeType, string> = {
  black: '黑无常',
  white: '白无常',
  judge: '地府判官',
};

export const JUDGE_DUTIES: Record<JudgeType, string> = {
  black: '安全审判',
  white: '性能审判',
  judge: '质量审判',
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: '极危',
  high: '高危',
  medium: '中危',
  low: '低危',
};

export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};