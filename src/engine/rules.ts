import type {
  Confidence,
  Issue,
  JudgeType,
  ScanInput,
  Severity,
} from '../domain/types';
import { SEVERITY_RANK } from '../domain/types';

export const ENGINE_VERSION = 'rule-engine/0.1.0';
export const MAX_ISSUES = 60;

interface RuleDefinition {
  ruleId: string;
  judge: JudgeType;
  crime: string;
  title: string;
  severity: Severity;
  confidence: Confidence;
  explanation: string;
  suggestion: string;
  detect: (ctx: PreparedSource) => number[];
}

export interface PreparedSource {
  lines: string[];
  /** Line with comments removed, string literals preserved. */
  code: string[];
  /** Line with comments and string-literal contents removed. */
  masked: string[];
}

interface ScanState {
  inBlockComment: boolean;
}

/**
 * Removes comments while respecting quoted strings. This is deliberately a
 * line scanner, not a parser: the rule engine is heuristic and never executes
 * submitted code.
 */
export function stripComments(line: string, state: ScanState): string {
  let out = '';
  let quote: string | null = null;
  let escaped = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    const next = line[i + 1];

    if (state.inBlockComment) {
      if (ch === '*' && next === '/') {
        state.inBlockComment = false;
        i += 2;
        out += ' ';
      } else {
        i += 1;
        out += ' ';
      }
      continue;
    }

    if (quote) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      i += 1;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    if (ch === '/' && next === '/') break;

    if (ch === '/' && next === '*') {
      state.inBlockComment = true;
      i += 2;
      out += ' ';
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

/** Replaces the contents of string literals with spaces, keeping delimiters. */
export function maskStrings(line: string): string {
  let out = '';
  let quote: string | null = null;
  let escaped = false;

  for (const ch of line) {
    if (quote) {
      if (escaped) {
        escaped = false;
        out += ' ';
      } else if (ch === '\\') {
        escaped = true;
        out += ' ';
      } else if (ch === quote) {
        quote = null;
        out += ch;
      } else {
        out += ' ';
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      out += ch;
      continue;
    }
    out += ch;
  }

  return out;
}

export function prepareSource(source: string): PreparedSource {
  const lines = source.split(/\r?\n/);
  const state: ScanState = { inBlockComment: false };
  const code = lines.map((line) => stripComments(line, state));
  const masked = code.map(maskStrings);
  return { lines, code, masked };
}

function braceDelta(line: string): number {
  let delta = 0;
  for (const ch of line) {
    if (ch === '{') delta += 1;
    else if (ch === '}') delta -= 1;
  }
  return delta;
}

interface EmptyCatchHit {
  line: number;
  endLine: number;
}

/** Finds `catch (...) { }` blocks whose body has no statements. */
export function findEmptyCatches(prepared: PreparedSource): EmptyCatchHit[] {
  const hits: EmptyCatchHit[] = [];
  const catchPattern = /\bcatch\s*(?:\([^)]*\))?\s*\{/;

  for (let i = 0; i < prepared.masked.length; i += 1) {
    const line = prepared.masked[i];
    const match = catchPattern.exec(line);
    if (!match) continue;

    const braceIndex = line.indexOf('{', match.index);
    if (braceIndex === -1) continue;

    let depth = 0;
    let found = false;
    let content = '';

    for (let j = i; j < Math.min(prepared.masked.length, i + 80); j += 1) {
      const current = prepared.masked[j];
      const from = j === i ? braceIndex : 0;
      for (let k = from; k < current.length; k += 1) {
        const ch = current[k];
        if (ch === '{') {
          depth += 1;
          if (depth === 1) continue;
        } else if (ch === '}') {
          depth -= 1;
          if (depth === 0) {
            found = true;
            break;
          }
        }
        if (depth >= 1) content += ch;
      }
      if (found) {
        const body = content.replace(/[{}]/g, '').trim();
        const rawBlock = prepared.lines.slice(i, j + 1).join('\n');
        const rawBody = rawBlock.slice(
          rawBlock.indexOf('{') + 1,
          rawBlock.lastIndexOf('}'),
        );
        const commentOnly = /(\/\/|\/\*)/.test(rawBody);
        if (body.length === 0 && !commentOnly) {
          hits.push({ line: i + 1, endLine: j + 1 });
        }
        i = j;
        break;
      }
    }
  }

  return hits;
}

function findEmptyCatchLines(prepared: PreparedSource): number[] {
  return findEmptyCatches(prepared).map((hit) => hit.line);
}

export function findNestedLoops(prepared: PreparedSource): number[] {
  const hits: number[] = [];
  const loopStack: number[] = [];
  let depth = 0;

  for (let i = 0; i < prepared.masked.length; i += 1) {
    const line = prepared.masked[i];
    const isLoop = /\b(for|while)\s*\(/.test(line) && line.includes('{');

    if (isLoop) {
      if (loopStack.some((openDepth) => openDepth < depth)) hits.push(i + 1);
      loopStack.push(depth);
    }

    depth += braceDelta(line);
    while (loopStack.length > 0 && loopStack[loopStack.length - 1] >= depth) {
      loopStack.pop();
    }
  }

  return hits;
}

const RULES: RuleDefinition[] = [
  {
    ruleId: 'eval-execution',
    judge: 'black',
    crime: '招魂执行禁术',
    title: '检测到 eval 动态执行',
    severity: 'critical',
    confidence: 'suspected',
    explanation:
      'eval 会把字符串当作当前作用域中的 JavaScript 执行。若参数可能来自请求、配置或用户输入，攻击者可借此执行任意代码。命中仅代表疑似风险，需结合参数来源人工确认。注释与普通字符串不会触发。',
    suggestion:
      '移除 eval，改用 JSON.parse（仅接受严格 JSON）、显式映射表或专用解析器；确需动态能力时，在隔离环境中执行并限制输入。',
    detect: (prepared) =>
      prepared.masked.reduce<number[]>((lines, line, index) => {
        if (/\beval\s*\(/.test(line)) lines.push(index + 1);
        return lines;
      }, []),
  },
  {
    ruleId: 'hardcoded-credential',
    judge: 'black',
    crime: '泄露天机罪',
    title: '疑似硬编码凭据',
    severity: 'high',
    confidence: 'suspected',
    explanation:
      '变量名看起来像口令、令牌或 API Key，且被直接赋值为字符串。提交到仓库后可能随构建产物泄露。这里是命名与赋值启发式，测试夹具、示例密钥同样会命中，请人工确认。',
    suggestion:
      '将凭据移入服务端环境变量或密钥管理服务，前端只持有短期、最小权限的公开标识；如为测试数据请明确标注并避免进入生产构建。',
    detect: (prepared) =>
      prepared.code.reduce<number[]>((lines, line, index) => {
        const pattern =
          /(password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|auth[_-]?token)\s*[:=]\s*(['"`])([^'"`\n]{4,})\2/i;
        if (pattern.test(line)) lines.push(index + 1);
        return lines;
      }, []),
  },
  {
    ruleId: 'sql-string-concat',
    judge: 'black',
    crime: '注入邪术罪',
    title: 'SQL 语句疑似拼接外部输入',
    severity: 'high',
    confidence: 'suspected',
    explanation:
      'SQL 关键字与字符串拼接或模板插值出现在同一行，且上下文涉及 query/execute。若拼接值来自用户，可能形成 SQL 注入。该规则是启发式，构造静态 SQL 或可信常量拼接可能误报。',
    suggestion:
      '改用参数化查询或预编译语句（如 db.query("... WHERE name = ?", [name])），不要用字符串拼接组装 SQL。',
    detect: (prepared) =>
      prepared.code.reduce<number[]>((lines, line, index) => {
        const sqlKeyword = /\b(select|insert|update|delete)\b/i.test(line);
        const hasConcat =
          /['"`]\s*\+/.test(line) || /`[^`]*\$\{/.test(line);
        const next = prepared.code[index + 1] ?? '';
        const dbContext =
          /\b(sql|query|execute|db|database|connection|stmt|prepare)\b/i.test(
            line,
          ) || /\b(query|execute)\s*\(/i.test(next);
        if (sqlKeyword && hasConcat && dbContext) lines.push(index + 1);
        return lines;
      }, []),
  },
  {
    ruleId: 'empty-catch',
    judge: 'judge',
    crime: '隐瞒案情罪',
    title: '空 catch 吞掉异常',
    severity: 'medium',
    confidence: 'confirmed',
    explanation:
      'catch 块内没有任何语句（或只有空白），异常被静默吞掉，排障时会失去关键线索。该判断基于源码结构，不是猜测。',
    suggestion:
      '至少记录异常（如 console.error）或将其转换为业务错误；若确实可忽略，请写注释说明原因并收窄捕获范围。',
    detect: findEmptyCatchLines,
  },
  {
    ruleId: 'nested-loop',
    judge: 'white',
    crime: '无尽轮回罪',
    title: '疑似嵌套循环热点',
    severity: 'low',
    confidence: 'suspected',
    explanation:
      '检测到循环体内还有循环，复杂度可能随输入规模放大。这是启发式提醒，不代表一定慢：数据量小、早退或内层循环为常数次时可能没有实际影响，需要基准测试确认。',
    suggestion:
      '考虑使用 Map/Set 建索引、提前退出或分页；用真实数据做基准测试后再决定是否优化。',
    detect: findNestedLoops,
  },
  {
    ruleId: 'console-output',
    judge: 'judge',
    crime: '喧哗扰民罪',
    title: '遗留调试输出',
    severity: 'low',
    confidence: 'confirmed',
    explanation:
      'console.log/debug/info/trace 可能把内部状态写入浏览器控制台或日志系统。这不是高危漏洞，仅在包含敏感数据或生产日志规范要求时升级处理。',
    suggestion: '生产代码移除调试输出，或接入带级别控制的结构化日志。',
    detect: (prepared) =>
      prepared.masked.reduce<number[]>((lines, line, index) => {
        if (/\bconsole\.(log|debug|info|trace)\s*\(/.test(line)) {
          lines.push(index + 1);
        }
        return lines;
      }, []),
  },
];

const RULE_BY_ID = new Map(RULES.map((rule) => [rule.ruleId, rule]));

export function getRule(ruleId: string): RuleDefinition | undefined {
  return RULE_BY_ID.get(ruleId);
}

/** Runs the deterministic, offline heuristic rules. Never executes source. */
export function scanSource(input: ScanInput): {
  issues: Issue[];
  truncated: boolean;
  scannedLines: number;
} {
  const source = input.source ?? '';
  const prepared = prepareSource(source);
  const file = input.filename || 'untitled.js';
  const seen = new Set<string>();
  const issues: Issue[] = [];

  for (const rule of RULES) {
    for (const lineNo of rule.detect(prepared)) {
      const evidence = (prepared.lines[lineNo - 1] ?? '').trim();
      if (!evidence) continue;
      const key = `${rule.ruleId}:${lineNo}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({
        id: `${rule.ruleId}-L${lineNo}`,
        judge: rule.judge,
        ruleId: rule.ruleId,
        crime: rule.crime,
        title: rule.title,
        severity: rule.severity,
        file,
        line: lineNo,
        evidence,
        explanation: rule.explanation,
        suggestion: rule.suggestion,
        confidence: rule.confidence,
        source: 'rule',
      });
    }
  }

  issues.sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      a.line - b.line ||
      a.ruleId.localeCompare(b.ruleId),
  );

  const truncated = issues.length > MAX_ISSUES;
  return {
    issues: issues.slice(0, MAX_ISSUES),
    truncated,
    scannedLines: prepared.lines.length,
  };
}