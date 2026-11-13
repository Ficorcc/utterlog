import { createHash } from 'node:crypto';
import { avatarPlatformUrls } from '@shared/avatar';

/**
 * 评论者头像候选链。
 *
 * 顺序固定，前端按序尝试，加载失败（404 / 加载错误）就换下一家，
 * 全部失败再退回「昵称首字」占位：
 *
 *   1. Utterlog 自带 —— 邮箱能匹配到本站注册用户时，他在本站上传的头像（users.avatar）
 *   2. Cravatar
 *   3. Weavatar
 *   4. Libravatar
 *   5. Loli.net
 *   6. Gravatar
 *
 * 两个坑：
 *
 * - 「Utterlog 自带」必须只在真的匹配到本站用户且他上传过头像时才有值。
 *   本站 ID 服务（id.utterlog.com）对任何邮箱都会 302 到 Gravatar 默认图，
 *   永远返回图片 —— 放第一项会让后面几家永远轮不到。
 *
 * - 每一家都必须带「没有头像就 404」的参数（d=404 / default=404）。
 *   默认行为是给一张通用占位图（mystery person），链条会在第一家就停下，
 *   「昵称首字」占位也就永远轮不到。本站镜像 img.ficor.net 同样忽略 d=404，
 *   所以链条里不用它。
 */
export function avatarCandidates(email: string, siteAvatar = '', size = 80): string[] {
  const list: string[] = [];
  const site = String(siteAvatar || '').trim();
  if (site) list.push(site);
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return list;
  const md5 = createHash('md5').update(normalized).digest('hex');
  const sha256 = createHash('sha256').update(normalized).digest('hex');
  list.push(...avatarPlatformUrls(md5, sha256, size));
  return list;
}
