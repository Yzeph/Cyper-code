import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, X } from 'lucide-react';
import type {
  DemoCase,
  Issue,
  Judgment,
  Language,
  LocateRequest,
  Phase,
} from './domain/types';
import { DEMO_CASES, MAX_SOURCE_LENGTH } from './data/demoCases';
import { judgeCode } from './engine/verdict';
import { BackgroundFX } from './components/BackgroundFX';
import { Header } from './components/Header';
import { GatePage } from './components/GatePage';
import { ThreeJudgesPage } from './components/ThreeJudgesPage';
import { VerdictBook } from './components/VerdictBook';
import { ResurrectionPanel } from './components/ResurrectionPanel';

const INITIAL_CASE = DEMO_CASES[0];

function App() {
  const [phase, setPhase] = useState<Phase>('gate');
  const [caseId, setCaseId] = useState(INITIAL_CASE.id);
  const [source, setSource] = useState(INITIAL_CASE.source);
  const [filename, setFilename] = useState(INITIAL_CASE.filename);
  const [language, setLanguage] = useState<Language>(INITIAL_CASE.language);
  const [judgment, setJudgment] = useState<Judgment | null>(null);
  const [isJudging, setIsJudging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locate, setLocate] = useState<LocateRequest | null>(null);
  const [resurrectOpen, setResurrectOpen] = useState(false);
  const [initialIssueId, setInitialIssueId] = useState<string | undefined>();
  const [stageMode, setStageMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('stage-mode', stageMode);
    return () => document.documentElement.classList.remove('stage-mode');
  }, [stageMode]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function runTrial(nextSource?: string, animate = true) {
    const code = nextSource ?? source;
    if (code.trim().length === 0) {
      setError('卷宗空空。请先输入或选择一段 JavaScript / TypeScript 代码。');
      return;
    }
    if (code.length > MAX_SOURCE_LENGTH) {
      setError(
        `代码长度 ${code.length.toLocaleString()} 字符，超过 ${MAX_SOURCE_LENGTH.toLocaleString()} 上限，请精简后再押送。`,
      );
      return;
    }

    setError(null);
    setLocate(null);
    setResurrectOpen(false);

    try {
      const result = judgeCode({ source: code, filename, language });
      setJudgment(result);
      if (!animate) {
        setPhase('verdict');
        setIsJudging(false);
        return;
      }
      setPhase('judging');
      setIsJudging(true);
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [
        window.setTimeout(() => {
          setPhase('verdict');
          setIsJudging(false);
        }, 1650),
      ];
    } catch (cause) {
      console.error('审判引擎异常', cause);
      setError('审判引擎异常：请检查代码格式后重试。引擎不会执行你的代码。');
      setPhase('gate');
      setIsJudging(false);
    }
  }

  function handleSelectCase(demo: DemoCase) {
    setCaseId(demo.id);
    setSource(demo.source);
    setFilename(demo.filename);
    setLanguage(demo.language);
    setJudgment(null);
    setError(null);
    setLocate(null);
    setPhase('gate');
    setResurrectOpen(false);
  }

  function handleLanguageChange(next: Language) {
    setLanguage(next);
    const extension = next === 'typescript' ? 'ts' : 'js';
    setFilename((current) => {
      if (/\.[jt]sx?$/.test(current)) {
        return current.replace(/\.[jt]sx?$/, `.${extension}`);
      }
      return `${current}.${extension}`;
    });
  }

  function handleLocate(issue: Issue) {
    setLocate({ line: issue.line, nonce: Date.now() });
    setPhase('gate');
    setToast(`已定位到第 ${issue.line} 行：${issue.crime}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleAdopt(nextSource: string) {
    setSource(nextSource);
    try {
      setJudgment(judgeCode({ source: nextSource, filename, language }));
    } catch (cause) {
      console.error('补丁后重新审判失败', cause);
    }
    setToast('补丁已采用，判决已按最新源码更新');
  }

  function handleUndo(previousSource: string) {
    setSource(previousSource);
    try {
      setJudgment(judgeCode({ source: previousSource, filename, language }));
    } catch (cause) {
      console.error('撤销后重新审判失败', cause);
    }
    setToast('已撤销补丁，源码恢复为采用前内容');
  }

  function openResurrect(issueId?: string) {
    if (!judgment || judgment.issues.length === 0) return;
    setInitialIssueId(issueId);
    setResurrectOpen(true);
  }

  function handleReset() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    setCaseId(INITIAL_CASE.id);
    setSource(INITIAL_CASE.source);
    setFilename(INITIAL_CASE.filename);
    setLanguage(INITIAL_CASE.language);
    setJudgment(null);
    setError(null);
    setLocate(null);
    setPhase('gate');
    setIsJudging(false);
    setResurrectOpen(false);
    setToast('演示已重置，阴间恢复出厂设置');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundFX />
      <Header
        phase={phase}
        hasJudgment={Boolean(judgment)}
        stageMode={stageMode}
        onToggleStage={() => setStageMode((value) => !value)}
        onReset={handleReset}
        onBackToVerdict={() => setPhase('verdict')}
        onHome={() => setPhase('gate')}
      />

      <main className="relative z-10">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          {phase === 'gate' && (
            <GatePage
              caseId={caseId}
              source={source}
              filename={filename}
              language={language}
              isJudging={isJudging}
              judgment={judgment}
              locate={locate}
              error={error}
              onSelectCase={handleSelectCase}
              onSourceChange={(next) => {
                setSource(next);
                if (error) setError(null);
              }}
              onFilenameChange={setFilename}
              onLanguageChange={handleLanguageChange}
              onJudge={() => runTrial()}
              onBackToVerdict={() => setPhase('verdict')}
            />
          )}

          {phase === 'judging' && judgment && (
            <ThreeJudgesPage judgment={judgment} />
          )}

          {phase === 'verdict' && judgment && (
            <VerdictBook
              judgment={judgment}
              source={source}
              onLocate={handleLocate}
              onResurrect={openResurrect}
              onRetrial={() => runTrial()}
              onReset={handleReset}
            />
          )}
        </motion.div>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-5 text-center">
        <p className="text-[10px] tracking-[0.14em] text-mist/35">
          赛博阎王殿 · 离线闭环 Demo · 规则引擎给出的是“疑似问题”，不是安全认证
        </p>
        <p className="mt-1 text-[10px] text-mist/25">
          不执行陌生代码 · 不上传源码 · 不自动提交 PR
        </p>
      </footer>

      {resurrectOpen && judgment && (
        <ResurrectionPanel
          issues={judgment.issues}
          initialIssueId={initialIssueId}
          source={source}
          filename={filename}
          language={language}
          onClose={() => setResurrectOpen(false)}
          onAdopt={handleAdopt}
          onUndo={handleUndo}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-hell-green/30 bg-[#0c1a12]/95 px-4 py-2.5 text-xs text-hell-green shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur"
        >
          <CheckCircle2 size={15} />
          {toast}
          <button
            type="button"
            aria-label="关闭提示"
            className="ml-1 text-hell-green/50 hover:text-hell-green"
            onClick={() => setToast(null)}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;