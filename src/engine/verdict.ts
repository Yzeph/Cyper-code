import type {
  JudgeSummary,
  JudgeType,
  Judgment,
  ScanInput,
  SeverityCounts,
} from '../domain/types';
import { JUDGE_LABELS } from '../domain/types';
import { calculateScore } from './score';
import { ENGINE_VERSION, scanSource } from './rules';

const JUDGE_TYPES: JudgeType[] = ['black', 'white', 'judge'];

const EMPTY_COUNTS: SeverityCounts = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
};

export function countSeverities(
  issues: Pick<Judgment['issues'][number], 'severity'>[],
): SeverityCounts {
  const counts = { ...EMPTY_COUNTS };
  for (const issue of issues) counts[issue.severity] += 1;
  return counts;
}

function buildJudgeVerdict(
  judge: JudgeType,
  issues: Judgment['issues'],
): string {
  const top = issues[0];
  if (issues.length === 0) {
    if (judge === 'black') return '锁链空响。安全司在当前已覆盖规则中未发现命中的疑点。';
    if (judge === 'white') return '轮回账上无异常。性能司未发现已覆盖规则命中的热点。';
    return '朱笔暂歇。质量司在当前已覆盖规则中未记下案情。';
  }
  if (judge === 'black') {
    return `黑无常锁链已响：安全司查获 ${issues.length} 处疑似风险，最重为【${top.crime}】。证据在册，速速自证。`;
  }
  if (judge === 'white') {
    return `白无常翻检轮回账：记下 ${issues.length} 处性能疑点，最重为【${top.crime}】。此为启发式提醒，仍需实测。`;
  }
  return `判官朱笔未停：质量司记下 ${issues.length} 处案情，最重为【${top.crime}】。莫要嘴硬，逐一修补。`;
}

function buildYamaVerdict(issues: Judgment['issues'], score: number): string {
  if (issues.length === 0) {
    return '阎王翻阅生死簿：当前覆盖的规则中暂未发现你的罪状。阴德尚存，但仍需保持敬畏——本殿不为任何代码开具“绝对安全”的证明。';
  }
  const top = issues[0];
  const count = issues.length;
  if (score >= 70) {
    return `堂下代码尚存良知，然【${top.crime}】等 ${count} 条罪状已入簿中。念你初犯，准你申请还阳，补全错漏，再回人间。`;
  }
  if (score >= 40) {
    return `判官笔落，${count} 条罪状赫然在册，尤以【${top.crime}】为甚。功德仅余 ${score}，莫要嘴硬，速去修补。`;
  }
  return `此码怨气冲天，共录得 ${count} 条罪状，【${top.crime}】领衔。功德只剩 ${score}，再不改，便打入重构地狱，永世不得上线。`;
}

/** Builds the full judgment from real rule-engine output. */
export function judgeCode(input: ScanInput): Judgment {
  const { issues, truncated, scannedLines } = scanSource(input);
  const score = calculateScore(issues);
  const severityCounts = countSeverities(issues);

  const judges = Object.fromEntries(
    JUDGE_TYPES.map((judge) => {
      const judgeIssues = issues.filter((issue) => issue.judge === judge);
      const summary: JudgeSummary = {
        judge,
        count: judgeIssues.length,
        issues: judgeIssues,
        verdict: buildJudgeVerdict(judge, judgeIssues),
      };
      return [judge, summary];
    }),
  ) as Record<JudgeType, JudgeSummary>;

  return {
    id: `judgment-${Date.now().toString(36)}`,
    filename: input.filename,
    language: input.language,
    issues,
    score,
    severityCounts,
    judges,
    yamaVerdict: buildYamaVerdict(issues, score),
    createdAt: new Date().toISOString(),
    engineVersion: ENGINE_VERSION,
    scannedLines,
    truncated,
  };
}

export function describeJudgeCoverage(judge: JudgeType): string {
  return `${JUDGE_LABELS[judge]}·启发式规则`;
}