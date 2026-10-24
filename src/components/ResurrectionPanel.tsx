import { useEffect, useMemo, useState } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleSlash,
  FlaskConical,
  Lock,
  ShieldCheck,
  Sparkles,
  Undo2,
  Wand2,
  X,
  XCircle,
} from 'lucide-react';
import type {
  Issue,
  Language,
  Patch,
  VerificationResult,
  VerificationStatus,
} from '../domain/types';
import { SEVERITY_LABELS } from '../domain/types';
import {
  generatePatch,
  getUnsupportedReason,
  type PatchContext,
} from '../engine/patcher';
import { verifyPatch } from '../engine/verify';
import { HELL_THEME, hellTheme } from './CodeEditor';

interface ResurrectionPanelProps {
  issues: Issue[];
  initialIssueId?: string;
  source: string;
  filename: string;
  language: Language;
  onClose: () => void;
  onAdopt: (nextSource: string) => void;
  onUndo: (previousSource: string) => void;
}

const STATUS_META: Record<
  VerificationStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  pass: {
    label: '通过',
    className: 'border-hell-green/35 bg-hell-green/10 text-hell-green',
    icon: CheckCircle2,
  },
  fail: {
    label: '失败',
    className: 'border-hell-red/35 bg-hell-red/10 text-red-300',
    icon: XCircle,
  },
  'not-run': {
    label: '未验证',
    className: 'border-white/10 bg-white/[0.02] text-mist/55',
    icon: CircleSlash,
  },
};

function StatusCard({
  title,
  status,
  hint,
}: {
  title: string;
  status: VerificationStatus;
  hint: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${meta.className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-[0.06em]">
          {title}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px]">
          <Icon size={13} />
          {meta.label}
        </span>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed opacity-70">{hint}</p>
    </div>
  );
}

function formatIssueNote(issue: Issue): string {
  return `${issue.crime} · L${issue.line} · ${SEVERITY_LABELS[issue.severity]}`;
}

export function ResurrectionPanel({
  issues,
  initialIssueId,
  source,
  filename,
  language,
  onClose,
  onAdopt,
  onUndo,
}: ResurrectionPanelProps) {
  const [snapshot] = useState<Issue[]>(issues);
  const [workingSource, setWorkingSource] = useState(source);
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialIssueId && snapshot.some((issue) => issue.id === initialIssueId)) {
      return initialIssueId;
    }
    const ctx: PatchContext = { source, filename, language };
    const preferred = snapshot.find((issue) => generatePatch(issue, ctx));
    return preferred?.id ?? snapshot[0]?.id ?? '';
  });
  const [appliedPatch, setAppliedPatch] = useState<Patch | null>(null);
  const [verification, setVerification] =
    useState<VerificationResult | null>(null);

  const ctx: PatchContext = useMemo(
    () => ({ source: workingSource, filename, language }),
    [workingSource, filename, language],
  );

  const patchableIds = useMemo(
    () =>
      new Set(
        snapshot
          .filter((issue) => generatePatch(issue, ctx) !== null)
          .map((issue) => issue.id),
      ),
    [snapshot, ctx],
  );

  const selectedIssue = snapshot.find((issue) => issue.id === selectedId) ?? null;
  const freshPatch = selectedIssue ? generatePatch(selectedIssue, ctx) : null;
  const displayPatch =
    appliedPatch && appliedPatch.issueId === selectedIssue?.id
      ? appliedPatch
      : freshPatch;

  const canAdopt =
    Boolean(displayPatch) && !Boolean(appliedPatch) && !verification?.passed;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  function handleSelect(issue: Issue) {
    if (issue.id === selectedId) return;
    setSelectedId(issue.id);
    setAppliedPatch(null);
    setVerification(null);
  }

  function handleAdopt() {
    if (!selectedIssue || !displayPatch || !canAdopt) return;
    const result = verifyPatch({
      before: workingSource,
      after: displayPatch.after,
      issue: selectedIssue,
      filename,
      language,
    });
    setVerification(result);
    setAppliedPatch(displayPatch);
    setWorkingSource(displayPatch.after);
    onAdopt(displayPatch.after);
  }

  function handleUndo() {
    if (!appliedPatch) return;
    setWorkingSource(appliedPatch.before);
    onUndo(appliedPatch.before);
    setAppliedPatch(null);
    setVerification(null);
  }

  const fixedNow =
    verification?.passed && appliedPatch?.issueId === selectedIssue?.id;

  return (
    <div
      className="overlay thin-scroll"
      role="dialog"
      aria-modal="true"
      aria-label="申请还阳：查看补丁与验证"
    >
      <div className="panel panel-strong stage-larger my-auto w-full max-w-6xl overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hell-purple/20 bg-black/30 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-hell-green/35 bg-hell-green/10 text-hell-green">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="font-display text-lg tracking-[0.1em] text-white">
                申请还阳 · 修复验证
              </h2>
              <p className="text-[10px] tracking-[0.08em] text-mist/50">
                补丁需人工确认，不会自动覆盖源码；全程不执行代码。
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="关闭还阳面板"
          >
            <X size={15} />
            关闭
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[290px_minmax(0,1fr)]">
          <aside className="max-h-[38vh] overflow-y-auto border-b border-hell-purple/15 bg-black/20 p-3 thin-scroll lg:max-h-[620px] lg:border-b-0 lg:border-r">
            <p className="mb-2 px-1 text-[10px] tracking-[0.16em] text-mist/45">
              待审罪状 · {snapshot.length} 条
            </p>
            <div className="space-y-1.5">
              {snapshot.map((issue) => {
                const active = issue.id === selectedId;
                const fixed =
                  appliedPatch?.issueId === issue.id && verification?.passed;
                const patchable = patchableIds.has(issue.id);
                return (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => handleSelect(issue)}
                    className="issue-row w-full rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-2 text-left"
                    data-selected={active}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] font-medium text-white/80">
                        {issue.crime}
                      </span>
                      <span className="mono text-[10px] text-mist/40">
                        L{issue.line}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-mist/45">
                        {SEVERITY_LABELS[issue.severity]}
                      </span>
                      {fixed ? (
                        <span className="badge badge-green">已修复</span>
                      ) : patchable ? (
                        <span className="badge badge-green">可修复</span>
                      ) : (
                        <span className="badge badge-gold">需人工</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-lg border border-hell-gold/20 bg-hell-gold/5 p-2.5">
              <p className="flex items-center gap-1.5 text-[10px] text-hell-gold/80">
                <AlertTriangle size={11} />
                补丁范围
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-mist/50">
                当前只对可识别的 eval 配置解析与空 catch 提供模板。
                其余罪状只给人工建议，不生成假 Diff。
              </p>
            </div>
          </aside>

          <div className="min-w-0 p-4 sm:p-5">
            {selectedIssue ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] tracking-[0.16em] text-mist/40">
                      当前罪状 · {formatIssueNote(selectedIssue)}
                    </p>
                    <h3 className="mt-1 font-display text-xl text-white">
                      {selectedIssue.title}
                    </h3>
                  </div>
                  {displayPatch ? (
                    <span className="badge badge-green">
                      <Wand2 size={11} />
                      已生成可解释补丁
                    </span>
                  ) : (
                    <span className="badge badge-gold">
                      <CircleSlash size={11} />
                      无自动补丁
                    </span>
                  )}
                </div>

                <pre className="evidence mt-3 max-h-24 overflow-auto thin-scroll">
                  <span className="mr-2 select-none text-mist/35">
                    {String(selectedIssue.line).padStart(3, ' ')}
                  </span>
                  {selectedIssue.evidence}
                </pre>

                {displayPatch ? (
                  <>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-[10px] tracking-[0.16em] text-mist/45">
                        原始代码 ↔ 建议补丁
                      </p>
                      <span className="text-[10px] text-mist/35">
                        只读预览 · 不自动应用
                      </span>
                    </div>
                    <div
                      className="diff-frame mt-1.5"
                      style={{ height: 'clamp(210px, 31vh, 340px)' }}
                    >
                      <DiffEditor
                        height="100%"
                        original={displayPatch.before}
                        modified={displayPatch.after}
                        language={language}
                        theme={HELL_THEME}
                        beforeMount={(monaco) =>
                          monaco.editor.defineTheme(HELL_THEME, hellTheme)
                        }
                        options={{
                          readOnly: true,
                          originalEditable: false,
                          renderSideBySide: false,
                          minimap: { enabled: false },
                          fontSize: 12,
                          lineHeight: 20,
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          padding: { top: 10, bottom: 10 },
                          wordWrap: 'off',
                          renderOverviewRuler: false,
                          scrollbar: {
                            verticalScrollbarSize: 9,
                            horizontalScrollbarSize: 9,
                          },
                        }}
                      />
                    </div>
                    <div className="mt-3 rounded-lg border border-hell-purple/15 bg-hell-purple/5 p-2.5">
                      <p className="text-[10px] tracking-[0.14em] text-hell-purple/70">
                        补丁理由
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-white/65">
                        {displayPatch.rationale}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-xl border border-hell-gold/20 bg-hell-gold/5 p-4">
                    <p className="flex items-center gap-2 text-sm text-hell-gold">
                      <AlertTriangle size={15} />
                      该罪状不生成自动补丁
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-mist/60">
                      {getUnsupportedReason(selectedIssue)}
                    </p>
                    <div className="mt-3 rounded-lg border border-white/5 bg-black/20 p-2.5">
                      <p className="text-[10px] tracking-[0.14em] text-mist/45">
                        人工修复建议
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-white/65">
                        {selectedIssue.suggestion}
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <StatusCard
                    title="语法检查"
                    status={verification?.syntax ?? 'not-run'}
                    hint="TypeScript 解析器静态检查"
                  />
                  <StatusCard
                    title="规则复扫"
                    status={verification?.rules ?? 'not-run'}
                    hint={`仅复扫 ${selectedIssue.crime}`}
                  />
                  <StatusCard
                    title="单元测试"
                    status="not-run"
                    hint="不执行陌生代码"
                  />
                </div>

                {verification ? (
                  <div
                    className={`mt-3 rounded-xl border p-3 ${
                      verification.passed
                        ? 'border-hell-green/35 bg-hell-green/10'
                        : 'border-hell-red/35 bg-hell-red/10'
                    }`}
                    role="status"
                  >
                    <p
                      className={`flex items-center gap-2 text-sm font-medium ${
                        verification.passed ? 'text-hell-green' : 'text-red-300'
                      }`}
                    >
                      {verification.passed ? (
                        <ShieldCheck size={16} />
                      ) : (
                        <XCircle size={16} />
                      )}
                      {verification.passed
                        ? '本次修复验证通过'
                        : '本次验证未通过'}
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-mist/55">
                      {verification.passed
                        ? '仅代表本次语法检查与对应规则复扫通过，不代表所有漏洞已修复，也不构成安全认证。'
                        : '请查看下方信息；本次未通过不代表代码不可修复，可人工调整后重新审判。'}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {verification.messages.map((message) => (
                        <li
                          key={message}
                          className="flex gap-1.5 text-[10px] leading-relaxed text-mist/60"
                        >
                          <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-current opacity-40" />
                          {message}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-[10px] leading-relaxed text-mist/50">
                    <FlaskConical size={13} className="mt-0.5 flex-shrink-0" />
                    <span>
                      采用补丁后才会执行静态语法检查与真实规则复扫。结果会分别标注
                      通过 / 失败 / 未验证；单元测试不会执行。
                    </span>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-3">
                  <span className="flex items-center gap-1.5 text-[10px] text-mist/40">
                    <Lock size={11} className="text-hell-green/70" />
                    原始输入未被覆盖，确认后才替换当前编辑器内容
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {appliedPatch && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={handleUndo}
                      >
                        <Undo2 size={13} />
                        撤销补丁
                      </button>
                    )}
                    {displayPatch && (
                      <button
                        type="button"
                        className="btn btn-return btn-sm"
                        onClick={handleAdopt}
                        disabled={!canAdopt}
                        title={
                          verification?.passed
                            ? '本次补丁已验证通过'
                            : '采用并执行静态验证'
                        }
                      >
                        <CheckCircle2 size={14} />
                        {verification?.passed
                          ? '已验证通过'
                          : '确认采用补丁'}
                      </button>
                    )}
                    {!displayPatch && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={onClose}
                      >
                        返回人工修复
                        <ArrowRight size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-10 text-center text-sm text-mist/50">
                卷宗中没有可处理的罪状。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}