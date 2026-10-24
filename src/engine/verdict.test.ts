import { describe, expect, it } from 'vitest';
import { DEMO_CASES } from '../data/demoCases';
import { calculateScore, getScoreTier } from './score';
import { judgeCode } from './verdict';

describe('功德值', () => {
  it('无问题为 100 分', () => {
    expect(calculateScore([])).toBe(100);
  });

  it('按严重程度确定性扣分', () => {
    expect(
      calculateScore([
        { severity: 'critical' },
        { severity: 'high' },
        { severity: 'medium' },
        { severity: 'low' },
      ]),
    ).toBe(100 - 25 - 15 - 7 - 3);
  });

  it('最低为 0 分', () => {
    expect(
      calculateScore(
        Array.from({ length: 10 }, () => ({ severity: 'critical' as const })),
      ),
    ).toBe(0);
  });

  it('分数档位稳定', () => {
    expect(getScoreTier(100).label).toBe('功德深厚');
    expect(getScoreTier(70).label).toBe('尚可还阳');
    expect(getScoreTier(40).label).toBe('罪孽深重');
    expect(getScoreTier(0).label).toBe('怨气冲天');
  });
});

describe('阎王判决来自真实扫描', () => {
  it('地府新手村：3 条罪状、65 功德、三位判官分工正确', () => {
    const demo = DEMO_CASES.find((item) => item.id === 'novice')!;
    const judgment = judgeCode({
      source: demo.source,
      filename: demo.filename,
      language: demo.language,
    });
    expect(judgment.issues).toHaveLength(3);
    expect(judgment.score).toBe(65);
    expect(judgment.judges.black.issues).toHaveLength(1);
    expect(judgment.judges.white.issues).toHaveLength(0);
    expect(judgment.judges.judge.issues).toHaveLength(2);
    expect(judgment.severityCounts).toEqual({
      critical: 1,
      high: 0,
      medium: 1,
      low: 1,
    });
    expect(judgment.yamaVerdict).toContain('招魂执行禁术');
    expect(judgment.yamaVerdict).not.toMatch(/随机|测试通过/);
  });

  it('黑无常重点犯人：2 条罪状、70 功德', () => {
    const demo = DEMO_CASES.find((item) => item.id === 'offender')!;
    const judgment = judgeCode({
      source: demo.source,
      filename: demo.filename,
      language: demo.language,
    });
    expect(judgment.issues).toHaveLength(2);
    expect(judgment.score).toBe(70);
    expect(judgment.judges.black.count).toBe(2);
    expect(judgment.yamaVerdict).toContain('泄露天机罪');
  });

  it('功德圆满：0 条罪状、100 功德，不宣称绝对安全', () => {
    const demo = DEMO_CASES.find((item) => item.id === 'merit')!;
    const judgment = judgeCode({
      source: demo.source,
      filename: demo.filename,
      language: demo.language,
    });
    expect(judgment.issues).toEqual([]);
    expect(judgment.score).toBe(100);
    expect(judgment.yamaVerdict).toContain('暂未发现');
    expect(judgment.yamaVerdict).toContain('绝对安全');
    expect(judgment.yamaVerdict).not.toMatch(/代码绝对安全。/);
  });

  it('同一源码重复审判结果确定', () => {
    const demo = DEMO_CASES.find((item) => item.id === 'novice')!;
    const input = {
      source: demo.source,
      filename: demo.filename,
      language: demo.language,
    };
    const first = judgeCode(input);
    const second = judgeCode(input);
    expect(second.issues.map((issue) => issue.id)).toEqual(
      first.issues.map((issue) => issue.id),
    );
    expect(second.score).toBe(first.score);
    expect(second.yamaVerdict).toBe(first.yamaVerdict);
  });
});