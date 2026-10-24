import type { DemoCase } from '../domain/types';

export const DEMO_CASES: DemoCase[] = [
  {
    id: 'novice',
    name: '地府新手村',
    filename: 'novice-soul.js',
    language: 'javascript',
    tagline: 'eval 招魂 + 空 catch 隐瞒',
    description:
      '实习判官的第一份代码：用 eval 解析配置，异常被静默吞掉。适合演示自动修复与真实复扫。',
    badge: '可修复',
    source: `// 地府新手村 · 实习判官的第一份代码
const soulBook = {
  xiaoming: { name: '小明', merit: 72 },
};

function summonSoul(rawConfig) {
  // 为了方便，直接把字符串当配置解析
  const config = eval("(" + rawConfig + ")");
  return config.name;
}

function readSoul(id) {
  try {
    return soulBook[id];
  } catch (e) {}
}

console.log('判官上班：', summonSoul('{"name":"阿飘"}'));
`,
  },
  {
    id: 'offender',
    name: '黑无常重点犯人',
    filename: 'repeat-offender.js',
    language: 'javascript',
    tagline: '硬编码密钥 + SQL 拼接',
    description:
      '疑似凭据写死在源码里，SQL 由外部变量拼接。两条高危罪状，但暂无可信的自动补丁。',
    badge: '高危',
    source: `// 黑无常重点犯人 · 凭据外泄与 SQL 拼接
const DB_API_KEY = 'sk-hell-demo-7f3a92';

function findSoul(db, name) {
  const sql = "SELECT * FROM souls WHERE name = '" + name + "'";
  return db.query(sql);
}

function listAll(db) {
  return db.query('SELECT * FROM souls');
}

module.exports = { findSoul, listAll };
`,
  },
  {
    id: 'merit',
    name: '功德圆满',
    filename: 'merit-full.ts',
    language: 'typescript',
    tagline: '不触发已覆盖规则的干净示例',
    description:
      '使用 Map 式查找与 reduce，无 eval、无拼接 SQL、无空 catch。用于展示“暂未发现问题”的空状态。',
    badge: '干净',
    source: `// 功德圆满 · 当前规则覆盖范围内的干净示例
interface Soul {
  id: number;
  name: string;
  merit: number;
}

const souls: Soul[] = [
  { id: 1, name: '阿福', merit: 88 },
  { id: 2, name: '阿喜', merit: 96 },
];

export function findSoul(id: number): Soul | undefined {
  return souls.find((soul) => soul.id === id);
}

export function totalMerit(list: Soul[]): number {
  return list.reduce((sum, soul) => sum + soul.merit, 0);
}

export function rankSouls(list: Soul[]): Soul[] {
  return [...list].sort((a, b) => b.merit - a.merit);
}
`,
  },
];

export function getDemoCase(id: string): DemoCase {
  return DEMO_CASES.find((item) => item.id === id) ?? DEMO_CASES[0];
}

export const MAX_SOURCE_LENGTH = 50_000;