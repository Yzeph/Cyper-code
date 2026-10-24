import { describe, expect, it } from 'vitest';
import type { Issue } from '../domain/types';
import { DEMO_CASES } from '../data/demoCases';
import { scanSource } from './rules';
import { generatePatch, getUnsupportedReason } from './patcher';
import { verifyPatch } from './verify';

const novice = DEMO_CASES.find((item) => item.id === 'novice')!;
const offender = DEMO_CASES.find((item) => item.id === 'offender')!;

function ctxOf(demo: typeof novice) {
  return {
    source: demo.source,
    filename: demo.filename,
    language: demo.language,
  };
}

function issueFor(demo: typeof novice, ruleId: string): Issue {
  const issue = scanSource({
    source: demo.source,
    filename: demo.filename,
    language: demo.language,
  }).issues.find((item) => item.ruleId === ruleId);
  if (!issue) throw new Error(`missing issue ${ruleId}`);
  return issue;
}

describe('还阳补丁：eval', () => {
  it('为演示 case 生成 JSON.parse 补丁并通过真实复扫', () => {
    const ctx = ctxOf(novice);
    const issue = issueFor(novice, 'eval-execution');
    const patch = generatePatch(issue, ctx);
    expect(patch).not.toBeNull();
    expect(patch!.after).toContain('JSON.parse(rawConfig)');
    expect(patch!.after).not.toContain('eval("(" + rawConfig + ")")');
    expect(patch!.before).toBe(novice.source);
    expect(patch!.startLine).toBe(issue.line);

    const result = verifyPatch({
      before: patch!.before,
      after: patch!.after,
      issue,
      filename: novice.filename,
      language: novice.language,
    });
    expect(result.syntax).toBe('pass');
    expect(result.rules).toBe('pass');
    expect(result.unitTests).toBe('not-run');
    expect(result.passed).toBe(true);
    expect(result.remaining).toEqual([]);
  });

  it('对无法识别形态的 eval 不伪造补丁', () => {
    const source = 'const value = eval(userInput);';
    const issue: Issue = {
      ...issueFor(novice, 'eval-execution'),
      line: 1,
      evidence: source,
    };
    const patch = generatePatch(issue, {
      source,
      filename: 'raw.js',
      language: 'javascript',
    });
    expect(patch).toBeNull();
    expect(getUnsupportedReason(issue)).toContain('人工');
  });
});

describe('还阳补丁：空 catch', () => {
  it('生成记录异常的补丁并通过真实复扫', () => {
    const ctx = ctxOf(novice);
    const issue = issueFor(novice, 'empty-catch');
    const patch = generatePatch(issue, ctx);
    expect(patch).not.toBeNull();
    expect(patch!.after).toContain('console.error');
    expect(patch!.after).toContain('异常已捕获');

    const result = verifyPatch({
      before: patch!.before,
      after: patch!.after,
      issue,
      filename: novice.filename,
      language: novice.language,
    });
    expect(result.syntax).toBe('pass');
    expect(result.rules).toBe('pass');
    expect(result.passed).toBe(true);
  });

  it('多行空 catch 也能修复', () => {
    const source = `try {
  run();
} catch (error) {
}`;
    const issue = scanSource({
      source,
      filename: 'multi.js',
      language: 'javascript',
    }).issues.find((item) => item.ruleId === 'empty-catch')!;
    const patch = generatePatch(issue, {
      source,
      filename: 'multi.js',
      language: 'javascript',
    });
    expect(patch).not.toBeNull();
    expect(patch!.after).toContain('console.error');
    expect(patch!.after).not.toMatch(/catch\s*\(error\)\s*\{\s*\}/);
  });
});

describe('还阳补丁：不支持的类型', () => {
  it('硬编码凭据不生成假 Diff', () => {
    const issue = issueFor(offender, 'hardcoded-credential');
    const patch = generatePatch(issue, ctxOf(offender));
    expect(patch).toBeNull();
    expect(getUnsupportedReason(issue)).toContain('人工');
  });

  it('SQL 拼接不生成假 Diff', () => {
    const issue = issueFor(offender, 'sql-string-concat');
    const patch = generatePatch(issue, ctxOf(offender));
    expect(patch).toBeNull();
  });
});

describe('静态验证', () => {
  it('语法错误会失败，且不执行代码', () => {
    const issue = issueFor(novice, 'eval-execution');
    const result = verifyPatch({
      before: 'const a = 1;',
      after: 'const = ;',
      issue,
      filename: 'broken.js',
      language: 'javascript',
    });
    expect(result.syntax).toBe('fail');
    expect(result.passed).toBe(false);
    expect(result.unitTests).toBe('not-run');
  });

  it('补丁未改变源码时标记未验证', () => {
    const issue = issueFor(novice, 'eval-execution');
    const result = verifyPatch({
      before: novice.source,
      after: novice.source,
      issue,
      filename: novice.filename,
      language: novice.language,
    });
    expect(result.syntax).toBe('not-run');
    expect(result.rules).toBe('not-run');
    expect(result.passed).toBe(false);
  });
});