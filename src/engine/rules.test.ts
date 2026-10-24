import { describe, expect, it } from 'vitest';
import type { Language } from '../domain/types';
import { DEMO_CASES } from '../data/demoCases';
import { prepareSource, scanSource } from './rules';

function scan(
  source: string,
  filename = 'test.js',
  language: Language = 'javascript',
) {
  return scanSource({ source, filename, language });
}

function rulesOf(source: string) {
  return scan(source).issues.map((issue) => issue.ruleId);
}

describe('规则引擎：输入边界', () => {
  it('空输入返回空结果且不抛错', () => {
    const result = scan('');
    expect(result.issues).toEqual([]);
    expect(result.scannedLines).toBe(1);
  });

  it('无问题代码返回空结果', () => {
    const source = `export function add(a: number, b: number): number {
  return a + b;
}
`;
    expect(scan(source, 'clean.ts', 'typescript').issues).toEqual([]);
  });

  it('证据必须是源码中真实存在的行', () => {
    const source = `const a = eval("1 + 1");
const API_KEY = "sk-test-1234";
`;
    const { issues } = scan(source);
    const lines = source.split('\n');
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      expect(issue.line).toBeGreaterThanOrEqual(1);
      expect(lines[issue.line - 1].trim()).toBe(issue.evidence);
      expect(lines[issue.line - 1]).toContain(issue.evidence);
    }
  });

  it('结果按严重程度排序', () => {
    const source = `console.log("debug");
const API_KEY = "sk-test-1234";
const a = eval("1 + 1");
`;
    const { issues } = scan(source);
    expect(issues.map((issue) => issue.ruleId)).toEqual([
      'eval-execution',
      'hardcoded-credential',
      'console-output',
    ]);
  });
});

describe('规则引擎：eval', () => {
  it('命中真实 eval 并给出行号与疑似标记', () => {
    const { issues } = scan(`const a = 1;
const b = eval("1 + 1");
`);
    const hit = issues.find((issue) => issue.ruleId === 'eval-execution');
    expect(hit).toBeDefined();
    expect(hit?.line).toBe(2);
    expect(hit?.severity).toBe('critical');
    expect(hit?.confidence).toBe('suspected');
    expect(hit?.judge).toBe('black');
    expect(hit?.evidence).toContain('eval');
  });

  it('忽略注释和普通字符串中的 eval', () => {
    const source = `// eval("a")
/* eval("b")
   still comment */
const label = "eval('c')";
`;
    expect(rulesOf(source)).not.toContain('eval-execution');
  });
});

describe('规则引擎：硬编码凭据', () => {
  it('命中疑似 API Key', () => {
    const { issues } = scan(`const DB_API_KEY = "sk-hell-demo-1234";`);
    const hit = issues.find((issue) => issue.ruleId === 'hardcoded-credential');
    expect(hit?.line).toBe(1);
    expect(hit?.severity).toBe('high');
    expect(hit?.confidence).toBe('suspected');
    expect(hit?.evidence).toContain('DB_API_KEY');
  });

  it('不把环境变量读取当作硬编码凭据', () => {
    const source = `const API_KEY = process.env.API_KEY;`;
    expect(rulesOf(source)).not.toContain('hardcoded-credential');
  });

  it('短占位符不误报', () => {
    const source = `const token = "abc";`;
    expect(rulesOf(source)).not.toContain('hardcoded-credential');
  });
});

describe('规则引擎：SQL 拼接', () => {
  it('命中字符串拼接 SQL', () => {
    const source = `function findSoul(db, name) {
  const sql = "SELECT * FROM souls WHERE name = '" + name + "'";
  return db.query(sql);
}`;
    const { issues } = scan(source);
    const hit = issues.find((issue) => issue.ruleId === 'sql-string-concat');
    expect(hit?.line).toBe(2);
    expect(hit?.severity).toBe('high');
    expect(hit?.confidence).toBe('suspected');
  });

  it('命中模板字符串插值 SQL', () => {
    const source = `const sql = \`SELECT * FROM souls WHERE name = '\${name}'\`;
db.query(sql);`;
    expect(rulesOf(source)).toContain('sql-string-concat');
  });

  it('静态 SQL 不误报', () => {
    const source = `const sql = "SELECT * FROM souls";
db.query(sql);`;
    expect(rulesOf(source)).not.toContain('sql-string-concat');
  });
});

describe('规则引擎：空 catch', () => {
  it('命中单行空 catch', () => {
    const { issues } = scan(`try { run(); } catch (error) {}`);
    const hit = issues.find((issue) => issue.ruleId === 'empty-catch');
    expect(hit).toBeDefined();
    expect(hit?.line).toBe(1);
    expect(hit?.confidence).toBe('confirmed');
    expect(hit?.judge).toBe('judge');
  });

  it('命中多行空 catch 并返回 catch 所在行', () => {
    const source = `try {
  run();
} catch (error) {
}`;
    const hit = scan(source).issues.find(
      (issue) => issue.ruleId === 'empty-catch',
    );
    expect(hit?.line).toBe(3);
  });

  it('有语句的 catch 不命中', () => {
    const source = `try {
  run();
} catch (error) {
  console.error(error);
}`;
    expect(rulesOf(source)).not.toContain('empty-catch');
  });

  it('仅写注释的 catch 视为有意忽略，不命中', () => {
    const source = `try {
  run();
} catch (error) {
  // 该异常可安全忽略
}`;
    expect(rulesOf(source)).not.toContain('empty-catch');
  });
});

describe('规则引擎：嵌套循环', () => {
  it('只把内层循环标记为疑似热点', () => {
    const source = `for (const row of rows) {
  for (const cell of row) {
    total += cell;
  }
}`;
    const hits = scan(source).issues.filter(
      (issue) => issue.ruleId === 'nested-loop',
    );
    expect(hits).toHaveLength(1);
    expect(hits[0].line).toBe(2);
    expect(hits[0].severity).toBe('low');
    expect(hits[0].judge).toBe('white');
    expect(hits[0].confidence).toBe('suspected');
  });

  it('顺序循环不误报', () => {
    const source = `for (const row of rows) {
  total += row;
}
for (const item of items) {
  total += item;
}`;
    expect(rulesOf(source)).not.toContain('nested-loop');
  });
});

describe('规则引擎：调试输出', () => {
  it('console.log 是低危，不是高危漏洞', () => {
    const hit = scan(`console.log("debug");`).issues.find(
      (issue) => issue.ruleId === 'console-output',
    );
    expect(hit?.severity).toBe('low');
    expect(hit?.confidence).toBe('confirmed');
  });
});

describe('内置案例走同一套真实引擎', () => {
  it('地府新手村命中 eval、空 catch 与调试输出', () => {
    const demo = DEMO_CASES.find((item) => item.id === 'novice')!;
    const { issues } = scanSource({
      source: demo.source,
      filename: demo.filename,
      language: demo.language,
    });
    expect(issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining(['eval-execution', 'empty-catch', 'console-output']),
    );
    expect(issues).toHaveLength(3);
  });

  it('黑无常重点犯人命中凭据与 SQL 拼接', () => {
    const demo = DEMO_CASES.find((item) => item.id === 'offender')!;
    const { issues } = scanSource({
      source: demo.source,
      filename: demo.filename,
      language: demo.language,
    });
    expect(issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining(['hardcoded-credential', 'sql-string-concat']),
    );
    expect(issues).toHaveLength(2);
  });

  it('功德圆满不触发任何规则', () => {
    const demo = DEMO_CASES.find((item) => item.id === 'merit')!;
    const { issues } = scanSource({
      source: demo.source,
      filename: demo.filename,
      language: demo.language,
    });
    expect(issues).toEqual([]);
  });
});

describe('源码预处理', () => {
  it('块注释可以跨行，字符串内容被遮罩而保留长度', () => {
    const prepared = prepareSource(`/* start
const x = "keep";
end */
const y = "eval('no')";`);
    expect(prepared.lines).toHaveLength(4);
    expect(prepared.masked[1]).not.toContain('keep');
    expect(prepared.masked[3]).not.toContain('eval');
    expect(prepared.masked[3].length).toBe(prepared.lines[3].length);
  });
});