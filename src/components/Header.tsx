import {
  ArrowLeft,
  CloudOff,
  Flame,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import type { Phase } from '../domain/types';

interface HeaderProps {
  phase: Phase;
  hasJudgment: boolean;
  stageMode: boolean;
  onToggleStage: () => void;
  onReset: () => void;
  onBackToVerdict: () => void;
  onHome: () => void;
}

export function Header({
  phase,
  hasJudgment,
  stageMode,
  onToggleStage,
  onReset,
  onBackToVerdict,
  onHome,
}: HeaderProps) {
  return (
    <header className="relative z-20 border-b border-hell-purple/15 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          className="group flex items-center gap-3 text-left"
          aria-label="返回鬼门关"
        >
          <span className="relative grid h-9 w-9 place-items-center rounded-xl border border-hell-red/35 bg-hell-red/10 text-hell-red shadow-[0_0_22px_rgba(239,68,68,0.16)]">
            <Flame size={19} className="orbit-pulse" />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg tracking-[0.18em] text-white/95">
              赛博阎王殿
            </span>
            <span className="stage-hide block text-[10px] tracking-[0.22em] text-mist/70">
              CYBER CODE HELL
            </span>
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className="badge stage-hide hidden border-hell-green/25 bg-hell-green/5 text-hell-green/90 sm:inline-flex">
            <CloudOff size={12} />
            离线审判 · 规则引擎
          </span>
          {phase === 'gate' && hasJudgment && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onBackToVerdict}
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">返回生死簿</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onToggleStage}
            aria-pressed={stageMode}
            title={stageMode ? '退出舞台模式' : '进入舞台模式（投影友好）'}
          >
            {stageMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span className="hidden md:inline">
              {stageMode ? '退出舞台' : '舞台模式'}
            </span>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onReset}
            title="重置演示并恢复初始化"
          >
            <RotateCcw size={14} />
            <span className="hidden md:inline">重置演示</span>
          </button>
        </div>
      </div>
    </header>
  );
}