import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test';

/**
 * AI 评论审核。这块此前零测试覆盖，而它决定「访客的评论是发出去还是进垃圾箱」。
 *
 * 两个方向都出过问题，所以两边都要锁：
 *   - **静默放行**：审核排在「全局审核开关」之后，而那个开关默认 false 会先把
 *     状态改成 approved，于是审核那行的 `status === 'pending'` 永远不成立 ——
 *     站长开了 AI 审核、配好 provider、测试通过，线上一条都没审。
 *   - **误杀**：`parsed.passed === true` 严格判断 + confidence 缺省取 0 + 默认
 *     阈值 0.8，导致 `{"passed":true}`（不给 confidence）这种最常见的模型输出
 *     被判成不通过，默认动作直接标 spam，而访客收到的是「已提交，审核通过后显示」。
 *
 * 判不出来的时候宁可漏过也不误杀 —— 垃圾评论还能人工删，误杀的正常评论
 * 用户不会再来第二次。
 */

const NOW = 1_800_000_000;

let options: Record<string, string> = {};
let aiRawResponse = '';
let aiShouldThrow: Error | null = null;
let insertedStatus = '';

mock.module('../src/backend/db/options', () => ({
  optionValue: async (name: string, fallback = '') => options[name] ?? fallback,
  saveOption: async () => {},
  readOptionMap: async () => ({}),
}));

mock.module('../src/backend/db/helpers', () => ({
  one: async (sql: string) => {
    if (sql.includes('ai_providers')) {
      return aiShouldThrow ? null : { id: 1, endpoint: 'https://api.example.com/v1/chat', model: 'gpt', api_key: 'k', timeout: 30 };
    }
    if (sql.includes('from') && sql.includes('posts')) return { id: 31, title: 'T', slug: 's', allow_comment: true };
    if (sql.includes('count(*)')) return { count: '0' };
    return null;
  },
  many: async (sql: string, params: unknown[] = []) => {
    if (sql.includes('insert into') && sql.includes('comments')) {
      insertedStatus = String(params[6] ?? '');
      return [{ id: 900 }];
    }
    return [];
  },
  exec: async () => ({ count: 1 }),
  nowUnix: () => NOW,
  intParam: (v: string | undefined, f = 0) => Number(v ?? f) || f,
  pageParams: () => ({ page: 1, perPage: 20 }),
}));

// 只桩掉网络，审核判定逻辑本身要真跑
const originalFetch = globalThis.fetch;
globalThis.fetch = (async () => {
  if (aiShouldThrow) throw aiShouldThrow;
  return new Response(JSON.stringify({ choices: [{ message: { content: aiRawResponse } }] }), { status: 200 });
}) as typeof fetch;

const { auditCommentContent } = await import('../src/backend/ai/comments');

beforeEach(() => {
  options = { ai_comment_audit_enabled: 'true' };
  aiRawResponse = '';
  aiShouldThrow = null;
  insertedStatus = '';
});

describe('模型输出的容错', () => {
  test('标准输出：通过', async () => {
    aiRawResponse = '{"passed": true, "confidence": 0.95, "reason": "正常讨论"}';
    const r = await auditCommentContent('这篇写得不错');
    expect(r?.passed).toBe(true);
  });

  test('标准输出：不通过', async () => {
    aiRawResponse = '{"passed": false, "confidence": 0.95, "reason": "赌博广告"}';
    const r = await auditCommentContent('澳门线上赌场');
    expect(r?.passed).toBe(false);
  });

  test('不给 confidence 不能当成 0 —— 这是最常见的模型输出，原来会被判不通过', async () => {
    aiRawResponse = '{"passed": true}';
    const r = await auditCommentContent('正常评论');
    expect(r?.passed).toBe(true);
  });

  test('passed 是字符串也认', async () => {
    for (const raw of ['{"passed":"true","confidence":0.95}', '{"passed":"yes","confidence":0.9}']) {
      aiRawResponse = raw;
      expect((await auditCommentContent('x'))?.passed).toBe(true);
    }
  });

  test('字段名写成 pass / ok 也认', async () => {
    for (const raw of ['{"pass":true,"confidence":0.95}', '{"ok":true,"confidence":0.9}']) {
      aiRawResponse = raw;
      expect((await auditCommentContent('x'))?.passed).toBe(true);
    }
  });

  test('模型裹了 Markdown 代码块也能解出来', async () => {
    aiRawResponse = '```json\n{"passed": true, "confidence": 0.9}\n```';
    expect((await auditCommentContent('x'))?.passed).toBe(true);
  });

  test('完全解析不出来时返回 null（当作没审），不是判不通过', async () => {
    for (const raw of ['我觉得这条评论没问题', 'null', '{"foo":"bar"}', '{坏 JSON']) {
      aiRawResponse = raw;
      expect(await auditCommentContent('正常评论')).toBeNull();
    }
  });

  test('模型返回空内容按失败抛出，不能记成 success', async () => {
    // 空返回原来照样记 success 并原样返回，接上「空回复也能发布」
    // 就会往评论区插一条正文只有徽章的评论
    aiRawResponse = '';
    await expect(auditCommentContent('正常评论')).rejects.toThrow('空内容');
  });
});

describe('置信度阈值双向生效', () => {
  test('低置信度的「不通过」也不算数 —— 原来只推翻低置信度的「通过」', async () => {
    options.ai_comment_audit_threshold = '0.8';
    aiRawResponse = '{"passed": false, "confidence": 0.05, "reason": "拿不准"}';
    // 0.05 的把握就把人家评论杀了，不合理；返回 null 交回上层当没审
    expect(await auditCommentContent('正常评论')).toBeNull();
  });

  test('低置信度的「通过」同样不算数', async () => {
    options.ai_comment_audit_threshold = '0.8';
    aiRawResponse = '{"passed": true, "confidence": 0.1}';
    expect(await auditCommentContent('可疑内容')).toBeNull();
  });

  test('高于阈值的结论正常生效', async () => {
    options.ai_comment_audit_threshold = '0.8';
    aiRawResponse = '{"passed": false, "confidence": 0.99, "reason": "垃圾广告"}';
    expect((await auditCommentContent('买粉丝加微信'))?.passed).toBe(false);
  });
});

describe('调用失败不能变成误杀', () => {
  test('AI 请求抛错时向上抛，由调用方按未审核处理', async () => {
    aiShouldThrow = new Error('The operation timed out');
    await expect(auditCommentContent('正常评论')).rejects.toThrow();
  });

  test('开关没开时直接返回 null，不发任何请求', async () => {
    options.ai_comment_audit_enabled = 'false';
    aiRawResponse = '{"passed": false, "confidence": 1}';
    expect(await auditCommentContent('随便什么')).toBeNull();
  });
});

describe('审核不再被全局审核开关短路', () => {
  // 这是最主要的问题：comment_moderation 默认 false，原来会在审核之前
  // 就把 status 改成 approved，导致审核那行的 status === 'pending' 永不成立。
  test('默认配置（comment_moderation 未开）下，审核依然会被调用', async () => {
    const src = await Bun.file('app/start/src/backend/services/public-comments.ts').text();
    const auditAt = src.indexOf('auditCommentContent');
    const moderationAt = src.indexOf("optionValue('comment_moderation'");
    expect(auditAt).toBeGreaterThan(0);
    expect(moderationAt).toBeGreaterThan(0);
    // 审核必须排在全局审核开关之前，否则默认配置下永远不执行
    expect(auditAt).toBeLessThan(moderationAt);
  });

  test('AI 判过不通过的评论，不会被后面的自动放行覆盖掉', async () => {
    const src = await Bun.file('app/start/src/backend/services/public-comments.ts').text();
    // 自动放行那段必须排除掉「AI 判了不通过」的情况
    const autoApprove = src.slice(src.indexOf("optionValue('comment_moderation'"));
    expect(autoApprove).toContain('aiAudit');
  });
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

describe('可观测性', () => {
  // 线上实测过：16 条 ai_logs 里有 12 条 user_id 为 null（评论审核、自动回复、
  // AI 陪读、语义搜索都写 null），而统计 SQL 带 `where user_id = $1`，
  // 于是后台「总调用次数 / 总 Token」看不到它们 —— 恰恰是唯一会失控烧钱的几类。
  test('AI 统计不按 user_id 过滤', async () => {
    const src = await Bun.file('app/start/src/backend/routes/ai.ts').text();
    const stats = src.slice(src.indexOf("if (action === 'stats')"), src.indexOf("if (action === 'stats')") + 1600);
    expect(stats).toContain('ai_logs');
    expect(stats).not.toMatch(/ai_logs\)\}\s+where user_id = \$1/);
    expect(stats).not.toMatch(/from \$\{table\('ai_logs'\)\} where user_id/);
  });

  test('评论侧的 logAi 会写 token 三列', async () => {
    const src = await Bun.file('app/start/src/backend/ai/comments.ts').text();
    const logAi = src.slice(src.indexOf('async function logAi'), src.indexOf('async function logAi') + 1200);
    for (const col of ['prompt_tokens', 'completion_tokens', 'total_tokens']) {
      expect(logAi).toContain(col);
    }
  });

  test('审核跑过就留一条结论日志，与开没开 AI 回复无关', async () => {
    const src = await Bun.file('app/start/src/backend/services/public-comments.ts').text();
    expect(src).toContain('logAuditDecision');
    // 必须在评论落库之后调用 —— 那时才知道最终状态
    expect(src.indexOf('logAuditDecision(id')).toBeGreaterThan(src.indexOf('rows[0]?.id'));
  });
});

describe('队列的数据正确性', () => {
  // 这几条是源码断言：行为要靠数据库才能测，但「改回去」是能在源码层拦住的。
  test('限流数的是队列表，不是 ai_logs —— 日志在调用返回后才写，延迟窗口会全绕过', async () => {
    const src = await Bun.file('app/start/src/backend/ai/comments.ts').text();
    const fn = src.slice(src.indexOf('async function replyRateLimitReached'), src.indexOf('async function replyDelayMs'));
    expect(fn).toContain("table('ai_comment_queue')");
    expect(fn).not.toContain("table('ai_logs')");
  });

  test('入队 insert 带 on conflict，唯一索引兜底并发去重', async () => {
    const src = await Bun.file('app/start/src/backend/ai/comments.ts').text();
    expect(src).toContain('on conflict (comment_id) do nothing');
    // 撞上时 returning 为空，必须提前返回，不能拿 queueId=0 去白跑一次 AI
    const after = src.slice(src.indexOf('on conflict (comment_id) do nothing'));
    expect(after).toContain('if (!queueId) return;');
  });

  test('迁移里有唯一索引与外键（新装库走 schema.sql，没有外键，靠这里统一补）', async () => {
    const src = await Bun.file('app/start/src/backend/db/client.ts').text();
    expect(src).toContain('create unique index if not exists idx_ai_comment_queue_comment');
    expect(src).toContain('ai_comment_queue');
    expect(src).toMatch(/foreign key \(comment_id\) references \$\{table\('comments'\)\}\(id\) on delete cascade/);
  });

  test('启动流程注册了中断恢复', async () => {
    const src = await Bun.file('app/start/src/backend/index.ts').text();
    expect(src).toContain('startAiQueueRecovery()');
  });
});

describe('关键词拦截不再误杀', () => {
  test('英文按词边界：Essex / sexism / adulthood 不能被拦', async () => {
    const src = await Bun.file('app/start/src/backend/services/public-comments.ts').text();
    // 不再有裸的 'sex' / 'adult' / 'subscribe' 子串项
    const listArea = src.slice(src.indexOf('SPAM_WORDS_EN'), src.indexOf('async function isSpamComment'));
    expect(listArea).not.toContain("'sex'");
    expect(listArea).not.toContain("'adult'");
    expect(listArea).not.toContain("'subscribe'");
    // 英文走词边界正则
    expect(src).toContain('SPAM_EN_RE');
  });

  test('中文不再有单字「药」—— 中药 / 药店 这类正常内容曾被整个拦掉', async () => {
    const src = await Bun.file('app/start/src/backend/services/public-comments.ts').text();
    const listArea = src.slice(src.indexOf('SPAM_WORDS_ZH'), src.indexOf('SPAM_EN_RE'));
    expect(listArea).not.toContain("'药'");
    expect(listArea).toContain("'壮阳药'");
  });
});
