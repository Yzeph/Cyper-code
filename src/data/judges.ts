import type { JudgeType } from '../domain/types';

export interface JudgeMeta {
  name: string;
  duty: string;
  epithet: string;
  description: string;
  accent: string;
  soft: string;
}

export const JUDGE_META: Record<JudgeType, JudgeMeta> = {
  black: {
    name: '黑无常',
    duty: '安全审判',
    epithet: '锁链所至，隐患现形',
    description: '专查动态执行、凭据泄露、注入风险。只认证据，不收人情。',
    accent: '#EF4444',
    soft: 'rgba(239, 68, 68, 0.12)',
  },
  white: {
    name: '白无常',
    duty: '性能审判',
    epithet: '轮回账上，算尽循环',
    description: '盯住复杂度与热点，但从不拿嵌套循环直接定罪。',
    accent: '#A855F7',
    soft: 'rgba(168, 85, 247, 0.12)',
  },
  judge: {
    name: '地府判官',
    duty: '质量审判',
    epithet: '朱笔一落，案情分明',
    description: '审查异常处理、可维护性与遗留调试输出。',
    accent: '#F5C97B',
    soft: 'rgba(245, 201, 123, 0.12)',
  },
};