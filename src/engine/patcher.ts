import type { Issue, Language, Patch } from '../domain/types';
import { findEmptyCatches, prepareSource } from './rules';

export interface PatchContext {
  source: string;
  filename: string;
  language: Language;
}

const EVAL_JSON_PATTERN =
  /\beval\s*\(\s*(['"])\(\1\s*\+\s*([A-Za-z_$][\w$]*)\s*\+\s*\1\)\1\s*\)/;

function buildPatch(
  issue: Issue,
  ctx: PatchContext,
  startLine: number,
  endLine: number,
  replacement: string[],
  rationale: string,
): Patch | null {
  const lines = ctx.source.split(/\r?\n/);
  if (startLine < 1 || endLine > lines.length) return null;
  const next = [
    ...lines.slice(0, startLine - 1),
    ...replacement,
    ...lines.slice(endLine),
  ];
  const after = next.join('\n');
  if (after === ctx.source) return null;
  return {
    id: `patch-${issue.id}`,
    issueId: issue.id,
    title: `修复【${issue.crime}】`,
    rationale,
    before: ctx.source,
    after,
    startLine,
    endLine,
  };
}

function buildEvalPatch(issue: Issue, ctx: PatchContext): Patch | null {
  const lines = ctx.source.split(/\r?\n/);
  const originalLine = lines[issue.line - 1];
  if (originalLine === undefined) return null;
  const match = EVAL_JSON_PATTERN.exec(originalLine);
  if (!match) return null;

  const variable = match[2];
  const replacementLine = originalLine.replace(
    match[0],
    `JSON.parse(${variable})`,
  );
  return buildPatch(
    issue,
    ctx,
    issue.line,
    issue.line,
    [replacementLine],
    `将 eval("(" + ${variable} + ")") 替换为 JSON.parse(${variable})。JSON.parse 只接受严格 JSON，不会执行任意 JavaScript；若输入并非 JSON，请改用显式解析器。此模板只处理这一种可识别形态，采用前请人工确认。`,
  );
}

function buildEmptyCatchPatch(issue: Issue, ctx: PatchContext): Patch | null {
  const prepared = prepareSource(ctx.source);
  const hit = findEmptyCatches(prepared).find((item) => item.line === issue.line);
  if (!hit) return null;

  const lines = ctx.source.split(/\r?\n/);
  const originalLine = lines[hit.line - 1] ?? '';
  const maskedLine = prepared.masked[hit.line - 1] ?? '';
  const catchIndex = maskedLine.indexOf('catch');
  if (catchIndex < 0) return null;

  const prefix = originalLine.slice(0, catchIndex);
  const prefixTrimmed = prefix.trim();
  if (prefixTrimmed !== '' && prefixTrimmed !== '}') return null;

  if (hit.endLine !== hit.line) {
    const closingLine = lines[hit.endLine - 1] ?? '';
    const afterClose = closingLine.slice(closingLine.lastIndexOf('}') + 1).trim();
    if (afterClose.length > 0) return null;
  }

  const catchSlice = originalLine.slice(catchIndex);
  const paramMatch = /catch\s*(?:\(\s*([A-Za-z_$][\w$]*)\s*\))?/.exec(
    catchSlice,
  );
  const param = paramMatch?.[1] ?? 'error';
  const leading = /^\s*/.exec(originalLine)?.[0] ?? '';
  const replacement = [
    `${prefix}catch (${param}) {`,
    `${leading}  console.error('[地府记录] 异常已捕获', ${param});`,
    `${leading}}`,
  ];

  return buildPatch(
    issue,
    ctx,
    hit.line,
    hit.endLine,
    replacement,
    '在空 catch 中记录异常对象，避免静默吞错。若该异常确实可以忽略，请改用注释说明原因并收窄捕获范围。补丁不会运行代码，只做静态复扫。',
  );
}

/** Returns a curated, explainable patch or null when no trusted template exists. */
export function generatePatch(issue: Issue, ctx: PatchContext): Patch | null {
  if (issue.source !== 'rule') return null;
  switch (issue.ruleId) {
    case 'eval-execution':
      return buildEvalPatch(issue, ctx);
    case 'empty-catch':
      return buildEmptyCatchPatch(issue, ctx);
    default:
      return null;
  }
}

export function getUnsupportedReason(issue: Issue): string {
  switch (issue.ruleId) {
    case 'eval-execution':
      return '这种 eval 调用形态没有可信的自动改写模板。请按右侧建议人工修复，本殿不伪造补丁。';
    case 'empty-catch':
      return '该 catch 结构与安全模板不匹配（例如同行还有其它语句）。请人工补充异常记录。';
    case 'hardcoded-credential':
      return '凭据迁移涉及部署环境与密钥管理，无法离线安全自动改写。请按建议人工处理。';
    case 'sql-string-concat':
      return '参数化查询需要了解数据库驱动与表结构，自动改写风险过高。请按建议人工修复。';
    case 'nested-loop':
      return '性能优化依赖真实数据规模与基准测试，不做自动改写。请先测量再优化。';
    case 'console-output':
      return '调试输出是否保留取决于项目日志规范，请人工决定。';
    default:
      return '该罪状暂无可信的自动修复模板，请参考建议人工处理。';
  }
}

export function getPatchableIssues(
  issues: Issue[],
  ctx: PatchContext,
): Issue[] {
  return issues.filter((issue) => generatePatch(issue, ctx) !== null);
}