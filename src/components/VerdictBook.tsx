import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Crosshair,
  FileWarning,
  Flame,
  Gavel,
  RotateCcw,
  Scale,
  ShieldAlert,
  Sparkles,
  Wand2,
  Wind,
} from 'lucide-react';
import type { Issue, JudgeType, Judgment, Severity } from '../domain/types';
import {
  JUDGE_LABELS,
  SEVERITY_LABELS,
  SEVERITY_RANK,
} from '../domain/types';
import { JUDGE_META } from '../data/judges';
import { getScoreTier } from '../engine/score';
import { generatePatch, getUnsupportedReason } from '../engine/patcher';

const JUDGE_ORDER: JudgeType[] = ['black', 'white', 'judge'];

const JUDGE_ICON: Record<JudgeType, typeof ShieldAlert> = {
  black: ShieldAlert,
  white: Wind,
  judge: Scale,
};

const SEVERITY_STYLE: Record<
  Severity,
  { text: string; border: string; bg: string; dot: string }
> = {
  critical: {
    text: 'text-red-300',
    border: 'border-red-500/35',
    bg: 'bg-red-500/10',
    dot: 'bg-red-500',
  },
  high: {
    text: 'text-orange-300',
    border: 'border-orange-400/30',
    bg: 'bg-orange-400/10',
    dot: 'bg-orange-400',
  },
  medium: {
    text: 'text-amber-200',
    border: 'border-amber-300/30',
    bg: 'bg-amber-300/10',
    dot: 'bg-amber-300',
  },
  low: {
    text: 'text-sky-200',
    border: 'border-sky-300/25',
    bg: 'bg-sky-300/10',
    dot: 'bg-sky-300',
  },
};

function SeverityBadge({ severity }: { severity: Severity }) {
  const style = SEVERITY_STYLE[severity];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] ${style.text} ${style.border} ${style.bg}`}
    >
      <span className={`h-1 w-1 rounded-full ${style.dot}`} />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

interface VerdictBookProps {
  judgment: Judgment;
  source: string;
  onLocate: (issue: Issue) => void;
  onResurrect: (issueId?: string) => void;
  onRetrial: () => void;
  onReset: () => void;
}

export function VerdictBook({
  judgment,
  source,
  onLocate,
  onResurrect,
  onRetrial,
  onReset,
}: VerdictBookProps) {
  const [selectedId, setSelectedId] = useState<string | null>(
    judgment.issues[0]?.id ?? null,
  );

  useEffect(() => {
    setSelectedId(judgment.issues[0]?.id ?? null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [judgment.id, judgment.issues]);

  const selected =
    judgment.issues.find((issue) => issue.id === selectedId) ?? null;
  const tier = getScoreTier(judgment.score);

  const patchableCount = useMemo(
    () =>
      judgment.issues.filter(
        (issue) =>
          generatePatch(issue, {
            source,
            filename: judgment.filename,
            language: judgment.language,
          }) !== null,
      ).length,
    [judgment.issues, judgment.filename, judgment.language, source],
  );

  const selectedPatch = selected
    ? generatePatch(selected, {
        source,
        filename: judgment.filename,
        language: judgment.language,
      })
    : null;

  const severityItems: Array<{ key: Severity; label: string }> = [
    { key: 'critical', label: '极危' },
    { key: 'high', label: '高危' },
    { key: 'medium', label: '中危' },
    { key: 'low', label: '低危' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-14 pt-7 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="badge badge-red">
              <Gavel size={12} />
              生死簿 · 阎王判决
            </span>
            <span className="badge">
              {judgment.filename} · 第 {judgment.scannedLines} 行已阅
            </span>
            {judgment.truncated && (
              <span className="badge badge-gold">结果已截断至 60 条</span>
            )}
          </div>
          <h1 className="stage-title title-glow font-display text-3xl tracking-[0.1em] text-white sm:text-5xl">
            阎王判决
          </h1>
          <p className="stage-hide mt-2 text-xs text-mist/60">
            判词只依据规则引擎真实命中的证据，不随机生成问题。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost" onClick={onRetrial}>
            <RotateCcw size={15} />
            重新审判
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onResurrect(selected?.id)}
            disabled={judgment.issues.length === 0}
            title={
              judgment.issues.length === 0
                ? '当前没有可修复的罪状'
                : '进入还阳流程'
            }
          >
            <Sparkles size={16} />
            申请还阳
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <section className="panel panel-strong relative mb-5 overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-hell-red/50 to-transparent" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="flex items-center gap-5">
            <div
              className="merit-ring shrink-0"
              style={{ '--merit': judgment.score } as CSSProperties}
              role="img"
              aria-label={`功德值 ${judgment.score}`}
            >
              <div className="text-center">
                <p className="font-display text-3xl font-semibold leading-none text-white">
                  {judgment.score}
                </p>
                <p className="mt-1 text-[9px] tracking-[0.2em] text-mist/55">
                  功德值
                </p>
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.22em] text-mist/45">
                MERIT SCORE
              </p>
              <p className="mt-1 font-display text-2xl text-hell-gold">
                {tier.label}
              </p>
              <p className="mt-1 max-w-[220px] text-[11px] leading-relaxed text-mist/55">
                {tier.description}
              </p>
              <span className="badge mt-2">{judgment.engineVersion}</span>
            </div>
          </div>

          <div className="hidden h-24 w-px bg-white/8 lg:block" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-hell-gold" />
              <h2 className="font-display text-sm tracking-[0.16em] text-white/85">
                阎王判词
              </h2>
            </div>
            <p className="stage-lead mt-3 text-sm leading-[1.9] text-white/80 sm:text-[15px]">
              {judgment.yamaVerdict}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {severityItems.map((item) => (
                <div
                  key={item.key}
                  className={`rounded-lg border px-2.5 py-2 ${SEVERITY_STYLE[item.key].border} ${SEVERITY_STYLE[item.key].bg}`}
                >
                  <p className="text-[10px] tracking-[0.12em] text-mist/55">
                    {item.label}
                  </p>
                  <p
                    className={`mt-0.5 font-display text-xl ${SEVERITY_STYLE[item.key].text}`}
                  >
                    {judgment.severityCounts[item.key]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-center lg:pr-3">
            <div className="seal">
              <span>
                阎王殿
                <br />
                已判决
                <br />
                <span className="text-[10px] tracking-[0.1em]">
                  {new Date(judgment.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-4 text-[11px]">
          <span className="flex items-center gap-1.5 text-mist/55">
            <Flame size={12} className="text-hell-red/80" />
            功德值 = 100 − 命中的严重程度扣分，是游戏化分数，不是安全认证。
          </span>
          <span className="flex items-center gap-1.5 text-hell-green/80">
            <Wand2 size={12} />
            可自动修复 {patchableCount} / {judgment.issues.length} 条
          </span>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {JUDGE_ORDER.map((judge) => {
              const meta = JUDGE_META[judge];
              const summary = judgment.judges[judge];
              const Icon = JUDGE_ICON[judge];
              return (
                <section
                  key={judge}
                  className="judge-card panel p-4"
                  style={
                    {
                      '--judge-accent': meta.accent,
                      background: `linear-gradient(165deg, ${meta.soft}, rgba(11,9,18,0.96) 55%)`,
                    } as CSSProperties
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid h-9 w-9 place-items-center rounded-lg border"
                        style={{
                          borderColor: `${meta.accent}55`,
                          background: `${meta.accent}18`,
                          color: meta.accent,
                        }}
                      >
                        <Icon size={17} />
                      </span>
                      <div>
                        <h2 className="font-display text-base tracking-[0.1em] text-white">
                          {JUDGE_LABELS[judge]}
                        </h2>
                        <p className="text-[10px] tracking-[0.12em] text-mist/50">
                          {meta.duty}
                        </p>
                      </div>
                    </div>
                    <span
                      className="font-display text-2xl leading-none"
                      style={{ color: meta.accent }}
                    >
                      {summary.count}
                    </span>
                  </div>

                  <p className="mt-3 min-h-[48px] text-[11px] leading-relaxed text-mist/60">
                    {summary.verdict}
                  </p>

                  <div className="mt-2 space-y-1.5">
                    {summary.issues.length === 0 ? (
                      <div className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2 text-[11px] text-mist/45">
                        当前覆盖规则中暂无命中。
                      </div>
                    ) : (
                      summary.issues.map((issue) => {
                        const active = issue.id === selectedId;
                        return (
                          <button
                            key={issue.id}
                            type="button"
                            onClick={() => setSelectedId(issue.id)}
                            className="issue-row w-full rounded-lg border border-white/6 bg-black/20 px-2.5 py-2 text-left"
                            data-selected={active}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate text-[11px] font-medium text-white/80">
                                {issue.crime}
                              </span>
                              <SeverityBadge severity={issue.severity} />
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-mist/45">
                              <span className="mono">L{issue.line}</span>
                              <span className="truncate">{issue.title}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>

          {judgment.issues.length === 0 && (
            <section className="panel border-hell-green/20 p-6 text-center">
              <CheckCircle2
                size={34}
                className="mx-auto text-hell-green/80 text-glow-green"
              />
              <h2 className="mt-3 font-display text-xl text-white">
                当前覆盖的规则中，暂未发现你的问题
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-xs leading-relaxed text-mist/55">
                这只是“已实现规则未命中”，不等于代码绝对安全。未覆盖的逻辑缺陷、
                业务风险与依赖漏洞，仍需人工审查与专项工具。
              </p>
              <button
                type="button"
                className="btn btn-ghost btn-sm mt-4"
                onClick={onReset}
              >
                <RotateCcw size={13} />
                换一份卷宗
              </button>
            </section>
          )}

          <p className="px-1 text-[10px] leading-relaxed text-mist/35">
            规则检测为启发式辅助：命中仅代表“疑似问题”，需人工确认；未命中不代表安全。
            本工具不执行提交的代码，不自动提交 PR，也不提供任何安全认证。
          </p>
        </div>

        <aside className="xl:sticky xl:top-20 xl:self-start">
          <section className="panel panel-strong overflow-hidden">
            <div className="flex items-center justify-between border-b border-hell-purple/15 bg-black/25 px-4 py-3">
              <div className="flex items-center gap-2">
                <FileWarning size={15} className="text-hell-red" />
                <h2 className="font-display text-sm tracking-[0.12em] text-white/85">
                  罪状详情
                </h2>
              </div>
              <span className="text-[10px] tracking-[0.15em] text-mist/40">
                EVIDENCE
              </span>
            </div>

            {selected ? (
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={selected.severity} />
                      <span className="badge">
                        {selected.confidence === 'confirmed'
                          ? '结构确认'
                          : '疑似 · 需人工确认'}
                      </span>
                    </div>
                    <h3 className="mt-2 font-display text-xl text-white">
                      {selected.crime}
                    </h3>
                    <p className="mt-1 text-xs text-mist/65">{selected.title}</p>
                  </div>
                  <span className="code-chip">L{selected.line}</span>
                </div>

                <div className="mt-4">
                  <p className="mb-1.5 text-[10px] tracking-[0.16em] text-mist/45">
                    原始证据
                  </p>
                  <pre className="evidence thin-scroll overflow-x-auto">
                    <span className="mr-2 select-none text-mist/35">
                      {String(selected.line).padStart(3, ' ')}
                    </span>
                    {selected.evidence}
                  </pre>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] tracking-[0.16em] text-mist/45">
                    为何有罪
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-mist/70">
                    {selected.explanation}
                  </p>
                </div>

                <div className="mt-3 rounded-lg border border-hell-purple/15 bg-hell-purple/5 p-3">
                  <p className="text-[10px] tracking-[0.16em] text-hell-purple/70">
                    修复建议
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/70">
                    {selected.suggestion}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-mist/40">
                    来源：规则引擎 · {selected.file}
                  </span>
                  {selectedPatch ? (
                    <span className="badge badge-green">
                      <Wand2 size={11} />
                      可申请补丁
                    </span>
                  ) : (
                    <span className="badge badge-gold">仅人工建议</span>
                  )}
                </div>

                {!selectedPatch && (
                  <p className="mt-2 text-[10px] leading-relaxed text-hell-gold/65">
                    {getUnsupportedReason(selected)}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onLocate(selected)}
                  >
                    <Crosshair size={13} />
                    定位源码
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onResurrect(selected.id)}
                  >
                    <Sparkles size={13} />
                    申请还阳
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center">
                <CheckCircle2
                  size={28}
                  className="mx-auto text-hell-green/70"
                />
                <p className="mt-2 font-display text-lg text-white/85">
                  暂无罪状可查
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-mist/50">
                  当前规则未命中，不能推断代码绝对安全。
                </p>
              </div>
            )}
          </section>

          <section className="panel mt-4 border-hell-gold/15 p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] text-hell-gold/75">
              <Gavel size={12} />
              下一步
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-mist/55">
              点击“申请还阳”查看可解释补丁与真实复扫。只有本次实际执行的语法检查与
              规则复扫都通过，才会显示“本次修复验证通过”。
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-mist/35">
              <span className="h-px flex-1 bg-white/5" />
              功德并非安全评分
              <span className="h-px flex-1 bg-white/5" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}