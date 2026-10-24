import ts from 'typescript';
import type {
  Issue,
  Language,
  VerificationResult,
} from '../domain/types';
import { scanSource } from './rules';

/** Static syntax check only. The submitted code is never executed. */
export function checkSyntax(
  source: string,
  filename: string,
  language: Language,
): { ok: boolean; messages: string[] } {
  const fileName =
    language === 'typescript'
      ? filename.replace(/\.[jt]sx?$/, '.ts')
      : filename.replace(/\.[jt]sx?$/, '.js');

  const result = ts.transpileModule(source, {
    fileName,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.ESNext,
      allowJs: true,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });

  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );

  return {
    ok: errors.length === 0,
    messages: errors.slice(0, 6).map((diagnostic) => {
      const position =
        diagnostic.file && diagnostic.start !== undefined
          ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
          : null;
      const where = position ? `第 ${position.line + 1} 行：` : '';
      return `${where}${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
    }),
  };
}

export interface VerifyPatchArgs {
  before: string;
  after: string;
  issue: Issue;
  filename: string;
  language: Language;
}

/**
 * Runs only static checks that can run offline:
 * 1. TypeScript syntactic diagnostics on the patched source.
 * 2. Rule re-scan confirming the targeted rule no longer fires.
 * Unit tests are never executed against user code.
 */
export function verifyPatch(args: VerifyPatchArgs): VerificationResult {
  const messages: string[] = [];

  if (args.after === args.before) {
    return {
      syntax: 'not-run',
      rules: 'not-run',
      unitTests: 'not-run',
      messages: ['补丁未改变源码，未执行验证。'],
      passed: false,
      remaining: [],
    };
  }

  const syntax = checkSyntax(args.after, args.filename, args.language);
  if (syntax.ok) {
    messages.push('语法检查通过（TypeScript 解析器，静态检查）。');
  } else {
    messages.push(...syntax.messages.map((message) => `语法错误：${message}`));
  }

  const { issues } = scanSource({
    filename: args.filename,
    language: args.language,
    source: args.after,
  });
  const remaining = issues.filter(
    (issue) => issue.ruleId === args.issue.ruleId,
  );
  const rules: VerificationResult['rules'] =
    remaining.length === 0 ? 'pass' : 'fail';

  if (rules === 'pass') {
    messages.push(`规则复扫通过：${args.issue.crime}不再命中。`);
  } else {
    messages.push(
      `规则复扫未通过：仍命中 ${remaining.length} 处同类问题（第 ${remaining
        .slice(0, 5)
        .map((issue) => issue.line)
        .join('、')} 行）。`,
    );
  }

  messages.push('单元测试：未执行（本工具绝不运行提交的陌生代码）。');

  return {
    syntax: syntax.ok ? 'pass' : 'fail',
    rules,
    unitTests: 'not-run',
    messages,
    passed: syntax.ok && rules === 'pass',
    remaining,
  };
}