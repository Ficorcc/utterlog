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
const site: EmailSite = { title: '西风', url: 'https://xifeng.net', logo: '' };

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
});
