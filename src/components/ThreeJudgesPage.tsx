import { useEffect, useState, type CSSProperties } from 'react';
import { motion } from 'motion/react';
import { Check, Loader2, Scale, ShieldAlert, Wind } from 'lucide-react';
import type { JudgeType, Judgment } from '../domain/types';
import { JUDGE_LABELS } from '../domain/types';
import { JUDGE_META } from '../data/judges';

const JUDGE_ICON: Record<JudgeType, typeof ShieldAlert> = {
  black: ShieldAlert,
  white: Wind,
  judge: Scale,
};

const WATERMARK: Record<JudgeType, string> = {
  black: '黑',
  white: '白',
  judge: '判',
};

const JUDGE_ORDER: JudgeType[] = ['black', 'white', 'judge'];

export function ThreeJudgesPage({ judgment }: { judgment: Judgment }) {
  const [revealed, setRevealed] = useState<number>(0);

  useEffect(() => {
    const timers = [320, 720, 1120].map((delay, index) =>
      window.setTimeout(() => setRevealed(index + 1), delay),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
      <div className="text-center">
        <span className="badge badge-red">
          <Loader2 size={12} className="animate-spin" />
          三司会审进行中
        </span>
        <h1 className="title-glow mt-4 font-display text-3xl tracking-[0.12em] text-white sm:text-5xl">
          堂下何人，报上代码
        </h1>
        <p className="mt-3 text-sm text-mist/70">
          黑无常锁链出鞘，白无常翻开轮回账，地府判官落笔朱砂。
        </p>
      </div>

      <div className="mt-9 grid gap-4 md:grid-cols-3">
        {JUDGE_ORDER.map((judge, index) => {
          const meta = JUDGE_META[judge];
          const Icon = JUDGE_ICON[judge];
          const summary = judgment.judges[judge];
          const isRevealed = revealed > index;
          return (
            <motion.div
              key={judge}
              initial={{ opacity: 0, y: 18, filter: 'blur(5px)' }}
              animate={{
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
              }}
              transition={{ duration: 0.4, delay: index * 0.18 }}
              className="judge-card panel p-5"
              data-active={isRevealed}
              style={
                {
                  '--judge-accent': meta.accent,
                  background: `linear-gradient(160deg, ${meta.soft}, rgba(11,9,18,0.94) 60%)`,
                } as CSSProperties
              }
            >
              <span className="judge-watermark">{WATERMARK[judge]}</span>
              <div className="relative flex items-center justify-between">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl border"
                  style={{
                    borderColor: `${meta.accent}55`,
                    background: `${meta.accent}18`,
                    color: meta.accent,
                  }}
                >
                  <Icon size={21} />
                </span>
                <span className="text-[10px] tracking-[0.22em] text-mist/45">
                  0{index + 1}
                </span>
              </div>
              <div className="relative mt-4">
                <h2 className="font-display text-2xl tracking-[0.12em] text-white">
                  {JUDGE_LABELS[judge]}
                </h2>
                <p className="mt-1 text-[11px] tracking-[0.16em] text-mist/55">
                  {meta.duty} · {meta.epithet}
                </p>
              </div>

              <div className="relative mt-5 border-t border-white/5 pt-4">
                {isRevealed ? (
                  <div className="stagger-in">
                    <p className="flex items-center gap-1.5 text-xs text-hell-green/90">
                      <Check size={13} />
                      审阅完毕，记录 {summary.count} 条
                    </p>
                    <p className="mt-2 min-h-[40px] text-xs leading-relaxed text-mist/65">
                      {summary.count > 0
                        ? `最重罪状：${summary.issues[0].crime}`
                        : '当前覆盖规则中暂无命中。'}
                    </p>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-xs text-mist/55">
                    <Loader2 size={13} className="animate-spin" />
                    正在逐行翻阅卷宗…
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mx-auto mt-10 max-w-xl">
        <div className="mb-2 flex items-center justify-between text-[11px] tracking-[0.14em] text-mist/55">
          <span>三司合议</span>
          <span>{Math.min(revealed, 3)} / 3</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-hell-red via-hell-purple to-hell-gold"
            initial={{ width: '8%' }}
            animate={{ width: `${(Math.max(revealed, 1) / 3) * 100}%` }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>
        <p className="mt-4 text-center text-[11px] text-mist/45">
          只看证据，不编罪状。判决即将呈上。
        </p>
      </div>
    </div>
  );
}