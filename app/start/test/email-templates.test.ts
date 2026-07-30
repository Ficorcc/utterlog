import { createHash } from 'node:crypto';
import { describe, expect, test } from 'bun:test';
import {
  commentReplyEmail,
  htmlEscape,
  newCommentEmail,
  noticeEmail,
  passwordResetEmail,
  verifyCodeEmail,
  type EmailSite,
} from '../src/backend/email/templates';

// 这套模板在 Bun 重写时丢过一次（退化成裸 <p>），而所有发信点都是
// `.catch(() => {})` 静默失败 —— 模板坏了线上不会有任何报错。这里锁住
// 几条不能退化的性质：外壳在、变量被转义、退订链接只在该出现时出现。
const site: EmailSite = { title: '西风', url: 'https://xifeng.net', logo: '', timeZone: 'Asia/Shanghai' };

function expectShell(html: string) {
  expect(html).toContain('<!doctype html>');
  // 邮件客户端（尤其 Outlook）只有 table 布局可靠，别改成 div/flex
  expect(html).toContain('<table');
  expect(html).toContain('max-width:600px');
  expect(html).toContain('Powered by');
  // 品牌区对读屏和邮件预览片段隐藏，正文才是开头
  expect(html).toContain('aria-hidden="true"');
}

describe('邮件模板', () => {
  test('验证码邮件带外壳、码值和有效期', () => {
    const html = verifyCodeEmail(site, { code: '482913', purpose: '登录', expireMins: 5 });
    expectShell(html);
    expect(html).toContain('482913');
    expect(html).toContain('5 分钟后过期');
    expect(html).toContain('西风');
  });

  test('密码重置邮件带按钮、明文链接和来源信息', () => {
    const html = passwordResetEmail(site, {
      userName: '西风', resetUrl: 'https://xifeng.net/admin/reset-password?token=abc',
      expireMins: 60, ip: '1.2.3.4', ipLocation: '上海', countryCode: 'cn',
    });
    expectShell(html);
    expect(html).toContain('重置密码');
    // 按钮点不动时要有可复制的明文链接
    expect(html).toContain('token=abc');
    expect(html).toContain('1.2.3.4');
    expect(html).toContain('flagcdn.io/flags/1x1/cn.svg');
    expect(html).toContain('安全提示');
  });

  test('评论回复邮件带回复者 Gravatar 头像，称呼与正文分两行', () => {
    const html = commentReplyEmail(site, {
      recipientName: '织梦岁月', replierName: '西风', replierEmail: 'Admin@Example.COM ',
      postTitle: 'GitShow：把 GitHub 账号变成一个自托管个人主页',
      originalContent: '原评论', replyContent: '回复内容',
      postUrl: 'https://xifeng.net/archives/31',
    });
    // 邮箱先小写去空白再 md5，这是 Gravatar 的规矩
    const md5 = createHash('md5').update('admin@example.com').digest('hex');
    expect(html).toContain(`gravatar.bluecdn.com/avatar/${md5}`);
    expect(html).toContain('d=mp');   // 没注册过的邮箱也要有默认图，不能是破图
    // 头像跟全站一样走直角 —— 之前这里是圆形、新评论通知里却是方形
    expect(html).not.toContain('border-radius');
    // 两行：称呼和主句合成一行，文章标题单独一行。标题不进主句是关键 ——
    // 塞进去的话长标题会把「回复了你的评论」挤到下一行。
    expect(html).toContain('你好 <b>织梦岁月</b>，<b>西风</b> 回复了你的评论</div>');
    expect(html).toContain('文章：《GitShow：把 GitHub 账号变成一个自托管个人主页》》'.replace('》》','》'));
    // 主句里不再夹标题
    expect(html).not.toContain('回复了你在《');

    // 没有回复者邮箱时不渲染空头像格
    const noAvatar = commentReplyEmail(site, {
      recipientName: '织梦岁月', replierName: '西风', postTitle: '某文',
      originalContent: '原评论', replyContent: '回复内容', postUrl: 'https://xifeng.net/archives/1',
    });
    expect(noAvatar).not.toContain('gravatar');
    expect(noAvatar).toContain('你好 <b>织梦岁月</b>，');
  });

  test('收件人头像在右上角，回复者头像挂在回复标签的昵称前', () => {
    const replier = createHash('md5').update('replier@example.com').digest('hex');
    const recipient = createHash('md5').update('recipient@example.com').digest('hex');
    const html = commentReplyEmail(site, {
      recipientName: '织梦岁月', replierName: '西风',
      replierEmail: 'replier@example.com', recipientEmail: 'recipient@example.com',
      postTitle: '某文', originalContent: '原评论', replyContent: '回复内容',
      postUrl: 'https://xifeng.net/archives/1',
      originalAt: 1785000000, replyAt: 1785003600,
    });
    const divider = html.indexOf('height:1px;background:#e1e6eb');
    // 收件人头像在品牌行（分隔线之上）
    expect(html.indexOf(recipient)).toBeLessThan(divider);
    // 回复者头像在「西风 的回复：」这行，且是 20px 小图
    expect(html.indexOf(replier)).toBeGreaterThan(html.indexOf('你说的是：'));
    expect(html.indexOf(replier)).toBeLessThan(html.indexOf('的回复：'));
    expect(html).toContain('width="20" height="20"');
    // 引用块自己不再带头像列 —— 正文占满宽度
    expect(html).not.toContain('width="36" height="36"');
    // 时间仍在标签行右端
    expect(html).toContain('align="right"');
    expect(html).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
  });

  test('品牌行是 logo 在前、站点名在后', () => {
    const html = commentReplyEmail({ ...site, logo: 'https://xifeng.net/logo.png' }, {
      recipientName: '织梦岁月', replierName: '西风', postTitle: '某文',
      originalContent: '原评论', replyContent: '回复内容', postUrl: 'https://xifeng.net/archives/1',
    });
    const divider = html.indexOf('height:1px;background:#e1e6eb');
    const nameAt = html.indexOf('>西风</span>');
    const logoAt = html.indexOf('logo.png');
    // 都在分隔线之上（品牌行内），且 logo 排在站点名之前
    expect(nameAt).toBeLessThan(divider);
    expect(logoAt).toBeLessThan(divider);
    expect(logoAt).toBeLessThan(nameAt);
  });

  test('评论回复邮件带退订入口，没有退订地址时不渲染空链接', () => {
    const withUnsub = commentReplyEmail(site, {
      recipientName: '访客', replierName: '西风', postTitle: '某文',
      originalContent: '原评论', replyContent: '回复内容',
      postUrl: 'https://xifeng.net/archives/1', unsubscribeUrl: 'https://xifeng.net/unsub?t=x',
    });
    expectShell(withUnsub);
    expect(withUnsub).toContain('unsub?t=x');
    expect(withUnsub).toContain('退订');

    const without = commentReplyEmail(site, {
      recipientName: '访客', replierName: '西风', postTitle: '某文',
      originalContent: '原评论', replyContent: '回复内容',
      postUrl: 'https://xifeng.net/archives/1',
    });
    expect(without).not.toContain('退订');
    expect(without).toContain('Powered by');
  });

  test('状态徽章是中文字样，昵称带链接、邮箱跟随', () => {
    const base = {
      author: '张三', postTitle: '某文', content: '正文',
      postUrl: 'https://xifeng.net/archives/1', manageUrl: 'https://xifeng.net/admin/comments',
    };
    // 文字徽章：符号在各家客户端字形和基线差太远，🗑 还会被渲染成彩色 emoji
    const approved = newCommentEmail(site, { ...base, status: 'approved' });
    expect(approved).toContain('已通过');
    expect(approved).toContain('#0f7b3f');
    expect(newCommentEmail(site, { ...base, status: 'pending' })).toContain('待审核');
    expect(newCommentEmail(site, { ...base, status: 'spam' })).toContain('垃圾评论');
    expect(newCommentEmail(site, { ...base, status: 'trash' })).toContain('已删除');
    // 不留任何符号
    expect(approved).not.toMatch(/[✓✕⋯🗑]/u);
    // 状态不再是标题里的括号文字
    expect(approved).not.toContain('（approved）');
    // 渲染在品牌行右上角而不是正文标题后 —— 标题长度不可控，跟在标题后
    // 会被挤到第二行吊着。
    expect(approved.indexOf('已通过')).toBeLessThan(approved.indexOf('发表了新评论'));
    // 没有状态时不渲染空徽章格
    expect(newCommentEmail(site, base)).not.toContain('已通过');
    // 未知状态回退成文字标签，不至于什么都不显示
    expect(newCommentEmail(site, { ...base, status: 'archived' })).toContain('archived');

    // 昵称本身链到访客网址，邮箱紧跟其后，网址不再单独占一行
    const both = newCommentEmail(site, { ...base, email: 'a@b.com', url: 'https://a.com' });
    expect(both).toContain('href="https://a.com"');
    expect(both).toContain('>张三</a>');            // 昵称是链接
    expect(both).toContain('mailto:a@b.com');
    // 完整 URL 不再作为独立文本出现（只在 href 里）
    expect(both).not.toContain('>https://a.com</a>');
    // 访客头像在昵称之前，22px 直角（跟昵称行高对齐，别撑高整行）
    expect(both).toContain('width="22" height="22"');
    const avatarMd5 = createHash('md5').update('a@b.com').digest('hex');
    expect(both.indexOf(avatarMd5)).toBeLessThan(both.indexOf('>张三</a>'));

    // 只有邮箱、没有网址时昵称退化成粗体文字
    const onlyEmail = newCommentEmail(site, { ...base, email: 'a@b.com' });
    expect(onlyEmail).toContain('<b style="color:#0d1a2d;font-weight:600;">张三</b>');
    expect(onlyEmail).toContain('mailto:a@b.com');
    // 两者都没有时不留下空链接，也不渲染空头像格
    const neither = newCommentEmail(site, base);
    expect(neither).not.toContain('mailto:');
    expect(neither).not.toContain('gravatar');
  });

  test('新评论邮件带双按钮与访客身份信息', () => {
    const html = newCommentEmail(site, {
      author: '张三', postTitle: '某文', content: '评论正文', status: 'approved',
      email: 'a@b.com', url: 'https://a.com', ip: '5.6.7.8', ipLocation: '东京',
      countryCode: 'jp', postUrl: 'https://xifeng.net/archives/1',
      manageUrl: 'https://xifeng.net/admin/comments',
    });
    expectShell(html);
    expect(html).toContain('查看文章');
    expect(html).toContain('管理评论');
    expect(html).toContain('mailto:a@b.com');
    expect(html).toContain('flagcdn.io/flags/1x1/jp.svg');
  });

  test('通用通知邮件在没有按钮时也完整', () => {
    const html = noticeEmail(site, { heading: '邮件服务配置成功', lines: ['第一行', '第二行'] });
    expectShell(html);
    expect(html).toContain('邮件服务配置成功');
    expect(html).toContain('第二行');
  });

  test('用户可控内容一律转义，评论不能注入 HTML', () => {
    const html = newCommentEmail(site, {
      author: '<script>alert(1)</script>',
      postTitle: '标题"引号"',
      content: '<img src=x onerror=alert(1)>',
      postUrl: 'https://xifeng.net/archives/1',
      manageUrl: 'https://xifeng.net/admin/comments',
    });
    // 判据是「尖括号被转义、不构成标签」，而不是文本里不许出现 onerror
    // 这个词 —— 转义后它只是一串普通字符，渲染不出任何东西。
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(htmlEscape(`<a href="x">&</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });

  test('没有 logo 时用站点名首字兜底，有 logo 时用图片', () => {
    expect(verifyCodeEmail(site, { code: '1' })).toContain('>西<');
    const withLogo = verifyCodeEmail({ ...site, logo: 'https://cdn/x.png' }, { code: '1' });
    expect(withLogo).toContain('src="https://cdn/x.png"');
  });

  test('emailSite 把站内相对路径的 logo 补成绝对地址', async () => {
    // 后台的 site_logo 常填 `/logo.png`，邮件客户端没有「当前站点」基准，
    // 相对路径必然是破图。这条锁住补全逻辑。
    const mod = await import('../src/backend/email/templates');
    const build = (logo: string) => verifyCodeEmail(
      { title: '西风', url: 'https://xifeng.net', logo: mod.absoluteUrlForTest(logo, 'https://xifeng.net'), timeZone: 'UTC' },
      { code: '1' },
    );
    expect(build('/logo.png')).toContain('src="https://xifeng.net/logo.png"');
    expect(build('logo.png')).toContain('src="https://xifeng.net/logo.png"');
    expect(build('https://cdn.example/x.png')).toContain('src="https://cdn.example/x.png"');
    expect(build('')).toContain('>西<');
  });
});

describe('审核按钮按状态给', () => {
  // 之前只判断链接存不存在，而链接是无条件生成的 —— 一条已经自动通过的评论，
  // 通知邮件里照样杵着一个「通过」按钮，点了什么也不会变。
  const site = { title: '西风', url: 'https://xifeng.net', logo: '', timeZone: 'Asia/Shanghai' };
  const base = {
    author: '访客', postTitle: '一篇文章', content: '内容',
    postUrl: 'https://x/p', manageUrl: 'https://x/admin',
    approveUrl: 'https://x/approve', spamUrl: 'https://x/spam', postedAt: 1_800_000_000,
  };
  const buttonsOf = (status: string) =>
    [...newCommentEmail(site, { ...base, status }).matchAll(/>(通过|标记垃圾)</g)].map((m) => m[1]);

  test('已通过的评论不再显示「通过」，但仍可标记垃圾', () => {
    expect(buttonsOf('approved')).toEqual(['标记垃圾']);
  });

  test('待审核两个都给', () => {
    expect(buttonsOf('pending')).toEqual(['通过', '标记垃圾']);
  });

  test('已是垃圾的只留「通过」用来恢复', () => {
    expect(buttonsOf('spam')).toEqual(['通过']);
  });

  test('回收站里的不给任何审核入口', () => {
    expect(buttonsOf('trash')).toEqual([]);
  });

  test('没有链接时不会凭空冒出按钮', () => {
    const html = newCommentEmail(site, { ...base, status: 'pending', approveUrl: '', spamUrl: '' });
    expect([...html.matchAll(/>(通过|标记垃圾)</g)]).toHaveLength(0);
  });
});

describe('邮件视觉统一', () => {
  const site = { title: '西风', url: 'https://xifeng.net', logo: '', timeZone: 'Asia/Shanghai' };
  const everyTemplate = () => [
    verifyCodeEmail(site, { code: '123456', minutes: 10 }),
    passwordResetEmail(site, { resetUrl: 'https://x/r', minutes: 30 }),
    commentReplyEmail(site, {
      recipientName: '织梦岁月', replierName: '西风', replierEmail: 'a@b.c', recipientEmail: 'd@e.f',
      originalAt: 1_800_000_000, replyAt: 1_800_003_600, postTitle: '文章',
      originalContent: '原文', replyContent: '回复', postUrl: 'https://x/p', unsubscribeUrl: 'https://x/u',
    }),
    newCommentEmail(site, {
      author: '访客', postTitle: '文章', content: '内容', postUrl: 'https://x/p', manageUrl: 'https://x/a',
      status: 'pending', approveUrl: 'https://x/ap', spamUrl: 'https://x/sp', postedAt: 1_800_000_000,
    }),
    noticeEmail(site, { heading: '测试邮件', lines: ['一行'], actionUrl: 'https://x', actionLabel: '查看' }),
  ];

  test('一律直角 —— 此前头像在两个模板里一个圆形一个方形', () => {
    for (const html of everyTemplate()) {
      expect(html).not.toContain('border-radius');
    }
  });

  test('不出现任何符号图标 —— 各家客户端字形和基线差太远', () => {
    for (const html of everyTemplate()) {
      expect(html).not.toMatch(/[✓✕⋯🗑✅❤👍📧🔔]/u);
    }
  });

  test('状态徽章用中文字样，不用符号', () => {
    const html = newCommentEmail(site, {
      author: '访客', postTitle: '文章', content: '内容', postUrl: 'https://x/p',
      manageUrl: 'https://x/a', status: 'approved', postedAt: 1_800_000_000,
    });
    expect(html).toContain('已通过');
  });
});
