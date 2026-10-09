'use client';

import api from '@/lib/api';
import { siteFaviconUrl } from '@/lib/site-favicon';
import { useThemeContext } from '@/lib/theme-context';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface FriendLink {
  id: number;
  name: string;
  url: string;
  description?: string;
  logo?: string;
  avatar?: string;
  group_name?: string;
  rss_url?: string;
}

interface LinkGroup {
  key: string;
  name: string;
  icon?: string;
}

const DEFAULT_GROUP_KEY = 'default';

function normalizeGroupKey(value: unknown) {
  return String(value || '').trim() || DEFAULT_GROUP_KEY;
}

function normalizeGroupIcon(value: unknown) {
  const raw = String(value || '').trim();
  const match = raw.match(/class=["']([^"']+)["']/i);
  return (match ? match[1] : raw).replace(/\s+/g, ' ').trim();
}

function parseGroups(raw: unknown): LinkGroup[] {
  const fallback = [{ key: DEFAULT_GROUP_KEY, name: '朋友', icon: 'fa-regular fa-folder' }];
  if (!raw) return fallback;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return fallback;
    const seen = new Set<string>();
    const groups = parsed.flatMap((item: any) => {
      const key = normalizeGroupKey(typeof item === 'string' ? item : item?.key ?? item?.name);
      if (seen.has(key)) return [];
      seen.add(key);
      return [{
        key,
        name: String(typeof item === 'string' ? item : item?.name ?? item?.key ?? '朋友').trim() || '朋友',
        icon: normalizeGroupIcon(typeof item === 'string' ? '' : item?.icon) || 'fa-regular fa-folder',
      }];
    });
    return groups.length ? groups : fallback;
  } catch {
    return fallback;
  }
}

function avatarOf(link: FriendLink) {
  return link.avatar || link.logo || siteFaviconUrl(link.url);
}

export default function ShanYingLinksView({
  initialLinks,
  initialOptions,
}: {
  initialLinks?: FriendLink[];
  initialOptions?: Record<string, string>;
} = {}) {
  const { site, owner } = useThemeContext();
  const hasInitialData = initialLinks !== undefined;
  const [links, setLinks] = useState(initialLinks || []);
  const [groups, setGroups] = useState<LinkGroup[]>(parseGroups(initialOptions?.link_groups));
  const [loading, setLoading] = useState(!hasInitialData);
  const [showApply, setShowApply] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [currentOrigin, setCurrentOrigin] = useState('');
  const [applying, setApplying] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', description: '', logo: '', avatar: '', rss_url: '', email: '' });

  useEffect(() => setCurrentOrigin(window.location.origin), []);

  const siteUrl = (site.url || currentOrigin).replace(/\/+$/, '');
  const avatarSource = owner.avatar || site.logo || site.favicon;
  const avatarUrl = avatarSource && siteUrl ? new URL(avatarSource, `${siteUrl}/`).href : avatarSource || '';
  const profileRows = [
    { label: '站点名称', value: site.title || owner.nickname || '我的博客' },
    { label: '站点描述', value: site.description || site.subtitle || owner.bio || '' },
    { label: '站点网址', value: siteUrl ? `${siteUrl}/` : '' },
    { label: 'RSS 链接', value: siteUrl ? `${siteUrl}/feed` : '' },
    { label: '头像地址', value: avatarUrl },
  ].filter((row) => row.value);

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`已复制${label}`);
    } catch {
      toast.error('复制失败，请检查浏览器剪贴板权限');
    }
  };

  useEffect(() => {
    if (hasInitialData) return;
    setLoading(true);
    Promise.all([api.get('/links', { params: { per_page: 500 } }), api.get('/options')])
      .then(([linksRes, optionsRes]: any[]) => {
        const items = linksRes.data || [];
        setLinks(items.filter((item: any) => item.status === 'publish' || item.status === 1));
        setGroups(parseGroups((optionsRes.data || optionsRes || {}).link_groups));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasInitialData]);

  useEffect(() => {
    if (!showApply && !showProfile) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!applying) setShowApply(false);
        setShowProfile(false);
      }
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [showApply, showProfile, applying]);

  const sections = useMemo(() => {
    const groupMap = new Map(groups.map((group) => [group.key, group]));
    const order = groups.map((group) => group.key);
    const buckets = new Map<string, FriendLink[]>();
    links.forEach((link) => {
      const key = normalizeGroupKey(link.group_name);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(link);
      if (!order.includes(key)) order.push(key);
    });
    return order.flatMap((key) => {
      const items = buckets.get(key) || [];
      if (!items.length) return [];
      return [{
        key,
        name: groupMap.get(key)?.name || (key === DEFAULT_GROUP_KEY ? '朋友' : key),
        icon: groupMap.get(key)?.icon || 'fa-regular fa-folder',
        items,
      }];
    });
  }, [groups, links]);

  const handleApply = async () => {
    if (!form.name.trim()) return toast.error('请输入站点名称');
    if (!form.url.trim()) return toast.error('请输入站点地址');
    setApplying(true);
    try {
      await api.post('/links/apply', {
        name: form.name.trim(),
        url: form.url.trim(),
        description: form.description.trim(),
        logo: form.logo.trim() || siteFaviconUrl(form.url.trim()),
        avatar: form.avatar.trim(),
        rss_url: form.rss_url.trim(),
        email: form.email.trim(),
      });
      toast.success('申请已提交，审核通过后将显示');
      setForm({ name: '', url: '', description: '', logo: '', avatar: '', rss_url: '', email: '' });
      setShowApply(false);
    } catch {
      toast.error('提交失败，请稍后重试');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="sy-links-page">
      <header className="sy-links-head">
        <h1><i className="fa-solid fa-link" aria-hidden="true" />友链</h1>
        <div className="sy-links-head-actions">
          <button type="button" className="sy-links-profile-button" onClick={() => setShowProfile(true)} aria-label="查看我的站点资料" title="我的站点资料">
            <i className="fa-regular fa-address-card" aria-hidden="true" />
          </button>
          <button type="button" className="sy-links-apply-button" onClick={() => setShowApply(true)}>
            <i className="fa-solid fa-plus" aria-hidden="true" />
            <span>申请友链</span>
          </button>
        </div>
      </header>

      <p className="sy-links-intro">在独立的角落，遇见同样认真记录生活的人。</p>

      {loading ? (
        <p className="sy-links-empty">加载中…</p>
      ) : sections.length === 0 ? (
        <p className="sy-links-empty">暂无友链</p>
      ) : sections.map((section) => (
        <section className="sy-links-group" key={section.key}>
          <header>
            <h2><i className={section.icon} aria-hidden="true" />{section.name}</h2>
            <span>{section.items.length} 个邻居</span>
          </header>
          <div className="sy-links-grid">
            {section.items.map((link) => (
              <a
                className="sy-link-chip"
                href={link.url}
                key={link.id}
                target="_blank"
                rel="noopener noreferrer"
                title={link.description || link.name}
              >
                <span className="sy-link-avatar">
                  <img
                    src={avatarOf(link)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={(event) => { event.currentTarget.src = siteFaviconUrl(link.url); }}
                  />
                </span>
                <strong>{link.name}</strong>
                {link.rss_url && <i className="sy-link-status" aria-label="已订阅 RSS" />}
              </a>
            ))}
          </div>
        </section>
      ))}

      {showProfile && (
        <div className="sy-link-modal-backdrop" onClick={() => setShowProfile(false)}>
          <div className="sy-link-modal sy-link-profile-modal" role="dialog" aria-modal="true" aria-labelledby="sy-link-profile-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2 id="sy-link-profile-title">我的站点资料</h2>
              <div className="sy-link-profile-actions">
                <button type="button" aria-label="复制全部站点资料" title="复制全部" onClick={() => void copyText(profileRows.map((row) => `${row.label}：${row.value}`).join('\n'), '全部资料')}><i className="fa-regular fa-copy" aria-hidden="true" /></button>
                <button type="button" aria-label="关闭站点资料" title="关闭" onClick={() => setShowProfile(false)}><i className="fa-regular fa-xmark" aria-hidden="true" /></button>
              </div>
            </header>
            <div className="sy-link-profile-hero">
              <img src={avatarUrl || (siteUrl ? siteFaviconUrl(siteUrl) : '')} alt="" />
              <div>
                <strong>{site.title || owner.nickname || '我的博客'}</strong>
                <p>{site.description || site.subtitle || owner.bio}</p>
                {owner.nickname && <span>{owner.nickname}</span>}
              </div>
            </div>
            <dl className="sy-link-profile-rows">
              {profileRows.map((row) => (
                <div className="sy-link-profile-row" key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                  <button type="button" aria-label={`复制${row.label}`} title={`复制${row.label}`} onClick={() => void copyText(row.value, row.label)}><i className="fa-regular fa-copy" aria-hidden="true" /></button>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {showApply && (
        <div className="sy-link-modal-backdrop" onClick={() => !applying && setShowApply(false)}>
          <div className="sy-link-modal" role="dialog" aria-modal="true" aria-labelledby="sy-link-modal-title" onClick={(event) => event.stopPropagation()}>
            <header>
              <div><p>LET’S CONNECT</p><h2 id="sy-link-modal-title">让我们成为邻居</h2></div>
              <button type="button" aria-label="关闭" onClick={() => !applying && setShowApply(false)}><i className="fa-regular fa-xmark" /></button>
            </header>
            <p className="sy-link-modal-intro">填写站点资料，审核通过后会在友链页展示。</p>
            <div className="sy-link-form">
              <label>站点名称 *<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="我的博客" /></label>
              <label>站点地址 *<input value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="https://example.com" /></label>
              <label className="sy-link-form-wide">一句介绍<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="你在这里记录些什么？" rows={2} /></label>
              <label>头像地址<input value={form.avatar} onChange={(event) => setForm({ ...form, avatar: event.target.value })} placeholder="留空自动获取" /></label>
              <label>RSS 地址<input value={form.rss_url} onChange={(event) => setForm({ ...form, rss_url: event.target.value })} placeholder="https://example.com/feed.xml" /></label>
              <label className="sy-link-form-wide">联系邮箱<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="方便通知审核结果（选填）" /></label>
            </div>
            <footer>
              <button type="button" onClick={() => !applying && setShowApply(false)}>取消</button>
              <button type="button" className="primary" disabled={applying} onClick={handleApply}>{applying ? '提交中…' : '提交申请'}</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
