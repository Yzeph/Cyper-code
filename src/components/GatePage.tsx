import {
  ArrowRight,
  Braces,
  Flame,
  Info,
  Lock,
  ShieldAlert,
  Sparkles,
  Terminal,
  TriangleAlert,
} from 'lucide-react';
import type {
  DemoCase,
  Judgment,
  Language,
  LocateRequest,
} from '../domain/types';
import { JUDGE_META } from '../data/judges';
import { DEMO_CASES, MAX_SOURCE_LENGTH } from '../data/demoCases';
import { CodeEditor } from './CodeEditor';

interface GatePageProps {
  caseId: string;
  source: string;
  filename: string;
  language: Language;
  isJudging: boolean;
  judgment: Judgment | null;
  locate: LocateRequest | null;
  error: string | null;
  onSelectCase: (demo: DemoCase) => void;
  onSourceChange: (source: string) => void;
  onFilenameChange: (filename: string) => void;
  onLanguageChange: (language: Language) => void;
  onJudge: () => void;
  onBackToVerdict: () => void;
}

const BADGE_CLASS: Record<string, string> = {
  novice: 'badge-green',
  offender: 'badge-red',
  merit: 'badge-gold',
};

export function GatePage({
  caseId,
  source,
  filename,
  language,
  isJudging,
  judgment,
  locate,
  error,
  onSelectCase,
  onSourceChange,
  onFilenameChange,
  onLanguageChange,
  onJudge,
  onBackToVerdict,
}: GatePageProps) {
  const lineCount = source.length === 0 ? 1 : source.split('\n').length;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-12 pt-7 sm:px-6">
      <section className="relative mb-6 text-center">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <span className="badge badge-red">
            <Flame size={12} />
            地府代码审查
          </span>
          <span className="badge">单文件 · JavaScript / TypeScript</span>
          <span className="badge badge-gold">
            <Sparkles size={12} />
            启发式 · 可解释
          </span>
        </div>
        <h1 className="stage-title title-glow font-display text-4xl leading-[1.12] font-semibold tracking-[0.08em] text-white sm:text-6xl lg:text-7xl">
          赛博阎王殿
        </h1>
        <p className="stage-lead mt-3 font-display text-lg tracking-[0.12em] text-hell-gold/90 sm:text-2xl">
          代码写得烂？阎王亲自判！
        </p>
        <p className="stage-hide mx-auto mt-2 max-w-2xl text-xs leading-relaxed text-mist/75 sm:text-sm">
          把一段 JS / TS 押送进鬼门关，黑无常、白无常与地府判官三司会审，
          阎王据实宣判。看得见行号，改得动代码，还阳要靠真实验证。
        </p>
        {judgment && (
          <button
            type="button"
            onClick={onBackToVerdict}
            className="btn btn-ghost btn-sm mt-4"
          >
            上次判决：功德 {judgment.score} · 返回生死簿
            <ArrowRight size={14} />
          </button>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel panel-strong overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b border-hell-purple/15 bg-black/20 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg border border-hell-purple/25 bg-hell-purple/10 text-hell-purple">
                <Braces size={16} />
              </span>
              <input
                value={filename}
                onChange={(event) => onFilenameChange(event.target.value)}
                aria-label="文件名"
                spellCheck={false}
                maxLength={80}
                className="mono min-w-0 flex-1 truncate border-none bg-transparent text-sm text-white/90 outline-none placeholder:text-mist/40"
              />
            </div>

            <div
              className="flex items-center rounded-lg border border-hell-purple/20 bg-black/30 p-0.5"
              role="group"
              aria-label="语言选择"
            >
              {(['javascript', 'typescript'] as Language[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => onLanguageChange(item)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium tracking-wide transition ${
                    language === item
                      ? 'bg-hell-purple/25 text-white shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                      : 'text-mist/70 hover:text-white'
                  }`}
                >
                  {item === 'javascript' ? 'JS' : 'TS'}
                </button>
              ))}
            </div>

            <span className="badge stage-hide">
              <Terminal size={11} />
              {lineCount} 行
            </span>
          </div>

          <div
            className="relative"
            style={{ height: 'clamp(300px, 40vh, 500px)' }}
          >
            <div className="scan-line top-0 opacity-40" aria-hidden="true" />
            <CodeEditor
              value={source}
              language={language}
              onChange={onSourceChange}
              locate={locate}
            />
          </div>

          <div className="border-t border-hell-purple/15 bg-black/20 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-mist/65">
                <Lock size={12} className="text-hell-green" />
                <span>代码只在浏览器内静态分析，不上传、不执行</span>
                <span className="text-mist/25">·</span>
                <span className={source.length > MAX_SOURCE_LENGTH ? 'text-hell-red' : ''}>
                  {source.length.toLocaleString()} / {MAX_SOURCE_LENGTH.toLocaleString()} 字符
                </span>
              </div>

              <button
                type="button"
                onClick={onJudge}
                disabled={isJudging || source.trim().length === 0}
                className="btn btn-primary min-w-[168px]"
              >
                <Flame size={17} />
                {isJudging ? '押送中…' : '押送审判'}
                <ArrowRight size={16} />
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-lg border border-hell-red/30 bg-hell-red/10 px-3 py-2 text-xs leading-relaxed text-red-200"
              >
                <TriangleAlert size={14} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base tracking-[0.12em] text-white/90">
                三司在殿
              </h2>
              <span className="text-[10px] tracking-[0.18em] text-mist/50">
                THREE JUDGES
              </span>
            </div>
            <div className="space-y-2.5">
              {(Object.keys(JUDGE_META) as Array<keyof typeof JUDGE_META>).map(
                (judge) => {
                  const meta = JUDGE_META[judge];
                  return (
                    <div
                      key={judge}
                      className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2"
                    >
                      <span
                        className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                        style={{
                          background: meta.accent,
                          boxShadow: `0 0 10px ${meta.accent}`,
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white/85">
                          {meta.name}
                          <span className="ml-2 text-[10px] text-mist/60">
                            {meta.duty}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-mist/55">
                          {meta.description}
                        </p>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </section>

          <section className="panel p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base tracking-[0.12em] text-white/90">
                内置卷宗
              </h2>
              <span className="badge">3 例</span>
            </div>
            <div className="space-y-2">
              {DEMO_CASES.map((demo) => {
                const active = demo.id === caseId;
                return (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => onSelectCase(demo)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? 'border-hell-purple/50 bg-hell-purple/10 shadow-[0_0_22px_rgba(168,85,247,0.08)]'
                        : 'border-white/6 bg-white/[0.02] hover:border-hell-purple/30 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-white/90">
                        {demo.name}
                      </span>
                      <span className={`badge ${BADGE_CLASS[demo.id] ?? ''}`}>
                        {demo.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-mist/65">
                      {demo.tagline}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-mist/45">
                      {demo.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel stage-hide border-hell-gold/15 p-4">
            <div className="mb-2 flex items-center gap-2 text-hell-gold/90">
              <Info size={14} />
              <h2 className="font-display text-sm tracking-[0.1em]">
                审判边界
              </h2>
            </div>
            <ul className="space-y-1.5 text-[11px] leading-relaxed text-mist/60">
              <li className="flex gap-2">
                <ShieldAlert size={12} className="mt-0.5 flex-shrink-0 text-hell-red/80" />
                规则为启发式检测，命中称“疑似问题”，不宣称绝对安全。
              </li>
              <li className="flex gap-2">
                <Lock size={12} className="mt-0.5 flex-shrink-0 text-hell-green/80" />
                绝不执行提交的陌生代码；验证仅做静态语法与规则复扫。
              </li>
              <li className="flex gap-2">
                <Sparkles size={12} className="mt-0.5 flex-shrink-0 text-hell-purple/80" />
                MVP 仅支持 JS/TS 单文件，其他语言暂不支持。
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}