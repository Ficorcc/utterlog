'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import Link from '@/components/AppLink';
import api from '@/lib/api';
import { useThemeContext } from '@/lib/theme-context';

/**
 * 友链页：对照上游 pages/friend.php 的结构。
 *
 *   .friend-page
 *     .friend-header > .friend-hero      标题 + 页面切换
 *     .friend-panel
 *       .friend-site-info                 本站信息（可复制）
 *       .friend-request-box               申请 / 修改入口
 *       .friend-panel-head                站点列表标题
 *       .friend-list > .friend-row       站点列表
 *     .friend-request-modal               申请友链弹窗
 */

interface FriendLink {
  id: number;
  name: string;
  url: string;
  description?: string;
  logo?: string;
  avatar?: string;
  rss_url?: string;
  group_name?: string;
}

function hostOf(url: string) {
  const raw = String(url || '').trim();
  try {
    const parsed = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    return parsed.host.replace(/^www\./i, '') || parsed.host;
  } catch {
    return raw.replace(/^www\./i, '');
  }
}

export default function LinksPage({
  initialLinks = [],
  initialOptions = {},
}: {
  initialLinks?: any[];
  initialOptions?: Record<string, string>;
}) {
  const { site, owner } = useThemeContext();
  const links: FriendLink[] = Array.isArray(initialLinks) ? initialLinks : [];

  const [showApply, setShowApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState('');
  const [form, setForm] = useState({ name: '', url: '', description: '', email: '' });

  const siteUrl = site?.url || '';
  const siteFields = [
    { label: '名称', value: site?.title || '' },
    { label: '地址', value: siteUrl },
    { label: '头像', value: site?.logo || owner?.avatar || '' },
    { label: '简介', value: site?.description || owner?.bio || '' },
    { label: '备案号', value: String(initialOptions?.beian_icp || '') },
  ].filter((item) => item.value);

  const copy = async (label: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 1500);
    } catch {
      toast.error('复制失败');
    }
  };

  const submitApply = async () => {
    if (!form.name.trim()) {
      toast.error('请填写站点名称');
      return;
    }
    if (!form.url.trim()) {
      toast.error('请填写站点地址');
      return;
    }
    setApplying(true);
    try {
      await api.post('/links/apply', {
        name: form.name.trim(),
        url: form.url.trim(),
        description: form.description.trim(),
        email: form.email.trim(),
      });
      toast.success('申请已提交，审核通过后会显示');
      setForm({ name: '', url: '', description: '', email: '' });
      setShowApply(false);
    } catch {
      toast.error('提交失败，请稍后重试');
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className="friend-page">
      <header className="friend-header">
        <div className="friend-hero">
          <div className="friend-hero-copy">
            <h1>
              <i className="fa-solid fa-user-group" aria-hidden="true" /> 友邻
            </h1>
            <p>友情链接与最近订阅更新</p>
          </div>
          <nav className="friend-tabs friend-title-tabs" aria-label="友情链接页面切换">
            <Link href="/links" prefetch={false} className="active" data-friend-tab="links" aria-current="page">
              <i className="fa-solid fa-user-group" aria-hidden="true" />
              <span>友情链接</span>
              <strong>{links.length}</strong>
            </Link>
            <Link href="/friends" prefetch={false} data-friend-tab="feeds" aria-current="false">
              <i className="fa-solid fa-share-nodes" aria-hidden="true" />
              <span>朋友圈</span>
              <strong>—</strong>
            </Link>
          </nav>
        </div>
      </header>

      <div className="friend-tab-panel" data-friend-panel="links">
        <div className="friend-panel">
          <div className="friend-site-info">
            <div className="friend-site-head">
              <h3>
                <i className="fa-regular fa-address-card" aria-hidden="true" /> 本站信息
              </h3>
            </div>
            <div className="friend-site-grid">
              {siteFields.length === 0 ? <p className="empty">还没有填写本站信息</p> : null}
              {siteFields.map((item) => (
                <div className="friend-site-field" key={item.label}>
                  <span className="friend-site-label">
                    <i className="fa-regular fa-copy" aria-hidden="true" /> {item.label}
                  </span>
                  <code>{item.value}</code>
                  <button
                    type="button"
                    className="friend-copy-btn"
                    onClick={() => void copy(item.label, item.value)}
                    title={`复制${item.label}`}
                    aria-label={`复制${item.label}`}
                  >
                    <i className={copied === item.label ? 'fa-solid fa-check' : 'fa-regular fa-copy'} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="friend-request-box" id="friend-link-request">
            <div className="friend-request-actions" aria-label="友链申请方式">
              <button type="button" className="friend-request-btn" onClick={() => setShowApply(true)}>
                <i className="fa-solid fa-user-plus" aria-hidden="true" />
                <span>申请链接</span>
              </button>
            </div>
          </div>

          <div className="friend-panel-head">
            <div>
              <h3>
                <i className="fa-solid fa-user-group" aria-hidden="true" /> 站点列表
              </h3>
              <p>{links.length} 个站点</p>
            </div>
          </div>

          <div className="friend-list">
            {links.length === 0 ? <p className="empty friend-empty">还没有添加友情链接。</p> : null}
            {links.map((link) => {
              const host = hostOf(link.url);
              // 上游没有 logo 时会退回 favicon.im 的站点图标
              const logo = link.logo || link.avatar || (host ? `https://favicon.im/${encodeURIComponent(host)}` : '');
              return (
                <a key={link.id} className="friend-row" href={link.url} target="_blank" rel="nofollow noopener">
                  {logo ? (
                    <img
                      className="friend-logo"
                      src={logo}
                      alt={`${host} favicon`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.style.visibility = 'hidden';
                      }}
                    />
                  ) : (
                    <span className="friend-logo" aria-hidden="true" />
                  )}
                  <span className="friend-info">
                    <strong>{link.name}</strong>
                    {link.description ? (
                      <>
                        <span>-</span>
                        <em>{link.description}</em>
                      </>
                    ) : null}
                  </span>
                  {link.rss_url ? (
                    <span className="friend-rss-indicator" title="已配置 RSS" aria-label="已配置 RSS">
                      <i className="fa-solid fa-square-rss" aria-hidden="true" />
                    </span>
                  ) : null}
                  <span className="friend-host">{host}</span>
                </a>
              );
            })}
          </div>

        </div>
      </div>

      {showApply ? (
        <div className="friend-request-modal" data-friend-request-dialog="apply">
          <section className="friend-request-dialog" role="dialog" aria-modal="true" aria-labelledby="friend-apply-title">
            <div className="friend-request-dialog-head">
              <div>
                <h3 id="friend-apply-title">
                  <i className="fa-solid fa-user-plus" aria-hidden="true" /> 申请友链
                </h3>
                <p>填写站点信息，提交后进入后台审核。</p>
              </div>
              <button type="button" className="friend-request-close" onClick={() => !applying && setShowApply(false)} aria-label="关闭">
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <div className="friend-request-dialog-body">
              <form
                className="friend-request-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitApply();
                }}
              >
                <div className="friend-request-grid">
                  <label className="friend-request-field">
                    <span>站点名称 *</span>
                    <input
                      type="text"
                      name="name"
                      required
                      maxLength={150}
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>
                  <label className="friend-request-field">
                    <span>站点地址 *</span>
                    <input
                      type="text"
                      name="url"
                      required
                      placeholder="https://example.com"
                      value={form.url}
                      onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                    />
                  </label>
                  <label className="friend-request-field friend-request-field-full">
                    <span>联系邮箱</span>
                    <input
                      type="email"
                      name="email"
                      maxLength={150}
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </label>
                  <label className="friend-request-field friend-request-field-full">
                    <span>站点描述</span>
                    <textarea
                      name="description"
                      rows={3}
                      maxLength={500}
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="friend-request-footer">
                  <p>提交后进入后台审核，通过后会出现在上方的友链列表中。</p>
                  <button type="submit" className="friend-request-submit" disabled={applying}>
                    {applying ? '提交中…' : '提交申请'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
