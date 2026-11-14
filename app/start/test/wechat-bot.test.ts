/**
 * 微信 Bot 命令处理测试。
 *
 * 这里不连数据库：把站点服务换成假实现（createWechatBot 的 deps 注入），
 * 只验「收到什么微信消息 → 回了什么、做了什么」这一层：
 * 命令解析、分步发布状态机、评论回复、订阅源刷新、白名单、图片上传。
 *
 * 重点防两类回归：
 *   1. 分步发布里控制指令被当成正文吞掉（/publish_done 被写进文章）
 *   2. 指令路由顺序错乱（会话中发 /help 被当成正文追加）
 *
 * 注意：这里刻意不用 mock.module —— 那是全局的，会污染同批次的其它测试。
 */

import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { createWechatBot, type WechatBotDeps } from '../src/backend/routes/wechat';

// ---------------------------------------------------------------------------
// 假实现
// ---------------------------------------------------------------------------

const options = new Map<string, string>();
const sentMessages: { to: string; text: string }[] = [];
const createdPosts: any[] = [];
const repliedComments: { parentId: number; content: string }[] = [];
const storedImages: { url: string; folder: string }[] = [];
const feedFetchCalls: any[] = [];

const pendingRows = [
  { id: 12, post_title: '测试文章', author_name: '访客甲', content: '写得不错', created_at: 1 },
];

const deps: WechatBotDeps = {
  optionValue: async (name: string, fallback = '') => options.get(name) ?? fallback,
  saveOption: async (name: string, value: string) => { options.set(name, value); },
  one: async (sql: string) => (sql.includes("role = 'admin'") ? { id: 1 } : null),
  many: async (sql: string) => (sql.includes('status in') ? pendingRows : []),
  exec: async () => ({ count: 1 }),
  nowUnix: () => Math.floor(Date.now() / 1000),
  intParam: (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  },
  createPost: async (body: Record<string, unknown>, userId: number) => {
    createdPosts.push({ body, userId });
    return 4242;
  },
  replyToAdminComment: async (parentId: number, _userId: number, input: any) => {
    repliedComments.push({ parentId, content: String(input?.content || '') });
    return { id: parentId + 100, notified: true };
  },
  storeUploadedBytes: async (_bytes: Buffer, ext: string, _mime: string, folder: string) => {
    const url = `https://cdn.example.com/${folder}/pic.${ext}`;
    storedImages.push({ url, folder });
    return { relativePath: `${folder}/pic.${ext}`, url, driver: 'local' };
  },
  runFeedFetch: async (opts: any) => {
    feedFetchCalls.push(opts);
    return { total: 3, fetched: 3, new_items: 5, failed: 0, failed_urls: [], pruned_subscriptions: 1 };
  },
  callAiText: async () => ({ content: 'AI 回答' }),
  buildDailyReport: async () => ({ date: '2026-01-01', lines: ['报告', '文章: 3'] }),
  sendText: async (to: string, text: string) => {
    sentMessages.push({ to, text });
    return true;
  },
  sendImage: async () => true,
  postPath: (post: Record<string, unknown>) => `/posts/${post.slug || 'demo'}`,
};

const bot = createWechatBot(deps);
const { processWechatInbound } = bot;

// 图片下载走的是真实 fetch，这里换成桩，避免测试真的去连外网。
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: any, init?: any) => {
  const url = String(typeof input === 'string' ? input : input?.url || '');
  if (url.includes('img.example.com')) {
    return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'content-type': 'image/png' } });
  }
  return realFetch(input, init);
}) as typeof fetch;

afterAll(() => {
  globalThis.fetch = realFetch;
});

// ---------------------------------------------------------------------------

const OWNER = 'wxid_owner';

function lastReply() {
  return sentMessages[sentMessages.length - 1]?.text || '';
}

async function send(text: string, extra: Record<string, unknown> = {}) {
  return processWechatInbound({ from: OWNER, text, type: 'text', ...extra } as any);
}

beforeEach(() => {
  options.clear();
  sentMessages.length = 0;
  createdPosts.length = 0;
  repliedComments.length = 0;
  storedImages.length = 0;
  feedFetchCalls.length = 0;
});

describe('基础命令', () => {
  test('/help 返回命令清单', async () => {
    await send('/help');
    expect(lastReply()).toContain('/publish');
    expect(lastReply()).toContain('/refresh');
  });

  test('/stats 返回数据报告', async () => {
    await send('/stats');
    expect(lastReply()).toContain('文章: 3');
  });

  test('/refresh 触发订阅源抓取并回报结果', async () => {
    await send('/refresh');
    expect(feedFetchCalls.length).toBe(1);
    expect(feedFetchCalls[0].force).toBe(true);
    expect(lastReply()).toContain('订阅源: 3');
    expect(lastReply()).toContain('新增条目: 5');
  });

  test('/comments 列出待审评论并给出命令', async () => {
    await send('/comments');
    expect(lastReply()).toContain('#12');
    expect(lastReply()).toContain('/approve 12');
  });

  test('/reply 调用评论回复服务', async () => {
    await send('/reply 12 谢谢你的留言');
    expect(repliedComments.length).toBe(1);
    expect(repliedComments[0].parentId).toBe(12);
    expect(repliedComments[0].content).toBe('谢谢你的留言');
    expect(lastReply()).toContain('评论回复已发布');
  });

  test('/reply 参数不全时给用法提示而不是报错', async () => {
    await send('/reply');
    expect(lastReply()).toContain('用法：/reply');
    expect(repliedComments.length).toBe(0);
  });

  test('/ai 把问题交给 AI 服务', async () => {
    await send('/ai 你好');
    expect(lastReply()).toContain('AI 回答');
  });
});

describe('分步发布文章', () => {
  test('完整流程：标题 → 正文 → 确认 → 发布', async () => {
    await send('/publish');
    expect(lastReply()).toContain('请发送标题');

    await send('我的新文章');
    expect(lastReply()).toContain('请发送正文');

    await send('这是第一段正文。');
    expect(lastReply()).toContain('已收到正文');

    await send('/publish_done');
    expect(lastReply()).toContain('请确认发布');
    expect(createdPosts.length).toBe(0);

    await send('/publish_confirm');
    expect(createdPosts.length).toBe(1);
    expect(createdPosts[0].body.title).toBe('我的新文章');
    expect(createdPosts[0].body.content).toContain('这是第一段正文。');
    expect(createdPosts[0].body.status).toBe('publish');
    expect(lastReply()).toContain('文章已发布');
  });

  test('长文分多条发送会拼接，不丢段', async () => {
    await send('/publish');
    await send('标题');
    await send('第一段');
    await send('第二段');
    await send('/publish_done');
    await send('/publish_confirm');
    expect(createdPosts[0].body.content).toContain('第一段');
    expect(createdPosts[0].body.content).toContain('第二段');
  });

  test('正文阶段收到 /publish_done 不会被当成正文写进文章', async () => {
    await send('/publish');
    await send('标题');
    await send('正文内容');
    await send('/publish_done');
    await send('/publish_confirm');
    expect(createdPosts[0].body.content).toContain('正文内容');
    expect(createdPosts[0].body.content).not.toContain('/publish_done');
  });

  test('正文阶段发 /help 是命令，不该被追加进正文', async () => {
    await send('/publish');
    await send('标题');
    await send('正文内容');
    await send('/help');
    expect(lastReply()).toContain('/publish');
    await send('/publish_done');
    await send('/publish_confirm');
    expect(createdPosts[0].body.content).toContain('正文内容');
    expect(createdPosts[0].body.content).not.toContain('/help');
  });

  test('确认阶段追加正文会更新字数', async () => {
    await send('/publish');
    await send('标题');
    await send('正文');
    await send('/publish_done');
    await send('再补一段');
    expect(lastReply()).toContain('已追加');
    await send('/publish_confirm');
    expect(createdPosts[0].body.content).toContain('再补一段');
  });

  test('/publish_cancel 清掉会话，之后发文字不会误发文章', async () => {
    await send('/publish');
    await send('标题');
    await send('/publish_cancel');
    expect(lastReply()).toContain('已取消');
    await send('/publish_confirm');
    expect(createdPosts.length).toBe(0);
  });

  test('没有会话时 /publish_confirm 给出提示而不是抛错', async () => {
    await send('/publish_confirm');
    expect(lastReply()).toContain('当前没有待发布的文章');
    expect(createdPosts.length).toBe(0);
  });

  test('没有会话时 /publish_done 不会误发说说', async () => {
    await send('/publish_done');
    expect(lastReply()).toContain('当前没有进行中的发布');
    expect(lastReply()).not.toContain('说说已发布');
  });

  test('会话只在同一个发送者之间生效', async () => {
    await send('/publish');
    await send('标题');
    // 换个人发同样的命令，不该继承别人的会话
    await processWechatInbound({ from: 'wxid_other', text: '/publish_done', type: 'text' } as any);
    expect(lastReply()).toContain('当前没有进行中的发布');
  });
});

describe('图片', () => {
  test('直接发图片会进媒体库并回传地址', async () => {
    await processWechatInbound({
      from: OWNER, type: 'image', imageUrl: 'https://img.example.com/a.png', text: '',
    } as any);
    expect(storedImages.length).toBe(1);
    expect(lastReply()).toContain('图片已上传到媒体库');
  });

  test('发布流程中发的图片被记作封面', async () => {
    await send('/publish');
    await send('标题');
    await processWechatInbound({
      from: OWNER, type: 'image', imageUrl: 'https://img.example.com/cover.png', text: '',
    } as any);
    expect(lastReply()).toContain('作为封面');
    await send('正文');
    await send('/publish_done');
    await send('/publish_confirm');
    expect(createdPosts[0].body.cover_url).toBeTruthy();
  });
});

describe('权限', () => {
  test('白名单外的用户消息被忽略', async () => {
    options.set('wechat_allowed_users', 'wxid_allowed');
    const result = await processWechatInbound({ from: 'wxid_stranger', text: '/publish', type: 'text' } as any);
    expect(result).toMatchObject({ ok: true, ignored: true });
    expect(sentMessages.length).toBe(0);
  });

  test('白名单内的用户正常执行', async () => {
    options.set('wechat_allowed_users', 'wxid_allowed');
    await processWechatInbound({ from: 'wxid_allowed', text: '/help', type: 'text' } as any);
    expect(lastReply()).toContain('/publish');
  });

  test('未设白名单时任何人都能操作', async () => {
    await processWechatInbound({ from: 'wxid_anybody', text: '/help', type: 'text' } as any);
    expect(sentMessages.length).toBe(1);
  });
});
