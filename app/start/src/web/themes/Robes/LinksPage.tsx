'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useThemeContext } from '@/lib/theme-context';
import { IconCheck, IconClose, IconEdit, IconHandshake, IconInfoCircle, IconLightbulb, IconListCheck, IconPriceTag, IconRss } from './Icons';

/**
 * 友链页：复刻原主题 links.php 的结构。
 *
 * 原版结构：
 *   .links-category-tabs → 按分类（sort）分组的胶囊 tab
 *   .links-grid          → .link-card 卡片网格
 *   .link-apply          → 底部「申请友链」信息区
 *   .cmt-modal           → 申请表单弹窗
 *
 * Utterlog 侧的对应关系：
 *   分类（sort）  → link.group_name
 *   头像（image） → link.avatar / link.logo
 *   提交申请      → POST /api/v1/links/apply
 */

interface Link {
  id: number;
  name: string;
  url: string;
  description?: string;
  logo?: string;
  avatar?: string;
  group_name?: string;
  rss_url?: string;
}

interface LinksProps {
  initialLinks?: Link[];
  initialOptions?: Record<string, string>;
}

const DEFAULT_GROUP = '默认';

function groupOf(link: Link) {
  return String(link.group_name || '').trim() || DEFAULT_GROUP;
}

function truncate(text: string, limit: number) {
  const value = String(text || '');
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

export default function LinksPage({ initialLinks = [] }: LinksProps) {
  const { site } = useThemeContext();
  const links = Array.isArray(initialLinks) ? initialLinks : [];

  const groups = useMemo(() => {
    const map = new Map<string, Link[]>();
    for (const link of links) {
      const key = groupOf(link);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(link);
    }
    return Array.from(map.entries());
  }, [links]);

  const [activeGroup, setActiveGroup] = useState<string>(() => groups[0]?.[0] || DEFAULT_GROUP);
  const currentGroup = groups.find(([key]) => key === activeGroup) || groups[0];

  const [showApply, setShowApply] = useState(false);
  const [applying, setApplying] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', description: '', email: '' });

  useEffect(() => {
    if (!showApply) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !applying) setShowApply(false);
    };
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [showApply, applying]);

  const submitApply = async () => {
    if (!form.name.trim()) { toast.error('请填写站点名称'); return; }
    if (!form.url.trim()) { toast.error('请填写站点地址'); return; }
    setApplying(true);
    try {
      await api.post('/links/apply', {
        name: form.name.trim(),
        url: form.url.trim(),
        description: form.description.trim(),
        email: form.email.trim(),
      });
      toast.success('申请已提交，审核通过后将显示');
      setForm({ name: '', url: '', description: '', email: '' });
      setShowApply(false);
    } catch {
      toast.error('提交失败，请稍后重试');
    } finally {
      setApplying(false);
    }
  };

  const siteUrl = site?.url || '';

  return (
    <article className="article standalone-page">
      {groups.length ? (
        <div className="links-category-tabs" id="linksCategoryTabs">
          {groups.map(([name, items]) => (
            <button
              key={name}
              type="button"
              className={name === currentGroup?.[0] ? 'links-cat-tab active' : 'links-cat-tab'}
              data-category={name}
              onClick={() => setActiveGroup(name)}
            >
              {name}
              <span className="links-cat-count">{items.length}</span>
            </button>
          ))}
        </div>
      ) : null}

      {groups.length ? (
        <div className="links-category-group" data-category={currentGroup?.[0] || ''}>
          <div className="links-grid">
            {(currentGroup?.[1] || []).map((link) => {
              const avatar = link.avatar || link.logo || '';
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-card"
                  data-url={link.url}
                >
                  <div className="link-avatar">
                    {avatar ? (
                      <img src={avatar} alt={link.name} loading="lazy" />
                    ) : (
                      <div className="link-avatar-text">{String(link.name || '友').slice(0, 1)}</div>
                    )}
                  </div>
                  <div className="link-info">
                    <div className="link-name">{link.name}</div>
                    {link.description ? <div className="link-desc">{truncate(link.description, 50)}</div> : null}
                    <div className="link-meta">
                      <span className="link-category-tag">
                        <IconPriceTag size={12} />
                        {groupOf(link)}
                      </span>
                      {link.rss_url ? (
                        <span className="link-last-comment">
                          <IconRss size={12} />
                          RSS
                        </span>
                      ) : null}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="links-empty">
          <IconInfoCircle size={32} />
          暂无友情链接，请在后台添加
        </div>
      )}

      <section className="link-apply" id="link-apply">
        <div className="link-apply-head">
          <span className="link-apply-icon">
            <IconHandshake size={20} />
          </span>
          <div className="link-apply-head-text">
            <h3 className="link-apply-title">申请友链</h3>
            <p className="link-apply-sub">欢迎交换友情链接，点击「立即申请」填写资料即可</p>
          </div>
          <button type="button" className="link-apply-btn" onClick={() => setShowApply(true)}>
            <IconEdit size={14} />
            立即申请
          </button>
        </div>

        <div className="link-apply-body">
          <div className="link-apply-col">
            <div className="link-apply-col-title">
              <IconInfoCircle size={14} />
              本站信息
            </div>
            <ul className="link-apply-list">
              <li>
                <span className="lk">名称</span>
                <span className="lv">{site?.title || ''}</span>
              </li>
              <li>
                <span className="lk">地址</span>
                <a className="lv" href={siteUrl} target="_blank" rel="noopener noreferrer">{siteUrl}</a>
              </li>
              {site?.logo ? (
                <li>
                  <span className="lk">头像地址</span>
                  <a className="lv" href={site.logo} target="_blank" rel="noopener noreferrer">{site.logo}</a>
                </li>
              ) : null}
              <li>
                <span className="lk">简介</span>
                <span className="lv">{site?.description || ''}</span>
              </li>
            </ul>
          </div>
          <div className="link-apply-col">
            <div className="link-apply-col-title">
              <IconListCheck size={14} />
              申请要求
            </div>
            <ul className="link-apply-rules">
              <li>
                <IconCheck size={13} />
                内容原创或有一定质量，无违法违规内容
              </li>
              <li>
                <IconCheck size={13} />
                已在贵站添加本站友链
              </li>
              <li>
                <IconCheck size={13} />
                保持更新，拒绝纯采集 / 长期停更站点
              </li>
            </ul>
          </div>
        </div>

        <div className="link-apply-note">
          <IconLightbulb size={14} />
          <span>提交后我们会尽快审核，通过后即可展示在上方友链列表中。</span>
        </div>
      </section>

      {showApply ? (
        <div className="cmt-modal active" id="cmt-apply-modal">
          <div className="cmt-modal-mask" onClick={() => !applying && setShowApply(false)} />
          <div className="cmt-modal-card" role="dialog" aria-modal="true" aria-labelledby="cmt-apply-modal-title">
            <button type="button" className="cmt-modal-close" onClick={() => !applying && setShowApply(false)} aria-label="关闭">
              <IconClose size={16} />
            </button>
            <div className="cmt-modal-head">
              <span className="cmt-modal-icon">
                <IconHandshake size={20} />
              </span>
              <div className="cmt-modal-head-text">
                <h3 className="cmt-modal-title" id="cmt-apply-modal-title">申请友情链接</h3>
                <p className="cmt-modal-sub">填写信息提交申请，审核通过后会展示在友链列表</p>
              </div>
            </div>
            <div className="cmt-modal-body">
              <div className="cmt-apply-tip">
                <IconInfoCircle size={14} />
                <span>填写<b>站点名称</b>、<b>站点地址</b>与<b>站点简介</b>即可，通过后会展示在上方友链列表。</span>
              </div>
              <div className="cmt-modal-form">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitApply();
                  }}
                >
                  <div className="cmt-fields">
                    <input
                      type="text"
                      name="author"
                      placeholder="站点名称 *"
                      value={form.name}
                      maxLength={50}
                      required
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    />
                    <input
                      type="email"
                      name="mail"
                      placeholder="联系邮箱 *"
                      value={form.email}
                      maxLength={100}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    />
                    <input
                      type="url"
                      name="url"
                      placeholder="站点地址 https:// *"
                      value={form.url}
                      maxLength={200}
                      required
                      onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                    />
                  </div>
                  <div className="cmt-textarea-wrap">
                    <textarea
                      name="text"
                      rows={3}
                      placeholder="站点简介：一句话介绍你的站点，并附上你的友链地址…"
                      value={form.description}
                      onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                    />
                  </div>
                  <div className="cmt-form-bar">
                    <div className="cmt-form-left">
                      <span className="cmt-hint">Ctrl + Enter 提交</span>
                    </div>
                    <button type="submit" className="cmt-submit" disabled={applying}>
                      {applying ? '提交中…' : '申请友链'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
