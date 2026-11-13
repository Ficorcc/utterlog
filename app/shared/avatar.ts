/**
 * 评论者头像平台顺序 —— 全站唯一一份。
 *
 * 后端（services/avatar.ts）用它拼候选链给前台，前台评论框预览头像也用它，
 * 避免前后端各写一份顺序、改一处漏一处。
 *
 * 顺序：Cravatar → Weavatar → Libravatar → Loli.net → Gravatar
 * （「Utterlog 自带」那一项需要查本站用户，只有后端拼得上，不在这里。）
 *
 * 每家都必须带「没有头像就 404」的参数（d=404 / default=404）：
 * 默认行为是给一张通用占位图，链条会在第一家就停下，后面的平台永远轮不到。
 */
export function avatarPlatformUrls(md5: string, sha256: string, size = 80): string[] {
  return [
    `https://cravatar.cn/avatar/${md5}?s=${size}&d=404`,
    `https://weavatar.com/avatar/${sha256}?s=${size}&default=404`,
    `https://seccdn.libravatar.org/avatar/${sha256}?s=${size}&d=404`,
    `https://loli.net/avatar/${md5}.png`,
    `https://gravatar.com/avatar/${md5}?s=${size}&d=404`,
  ];
}
