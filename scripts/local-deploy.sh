#!/usr/bin/env bash
# 本地构建 → 部署服务器 → 提交推送 GitHub 一体化脚本
#
# 用法:
#   ./scripts/local-deploy.sh -m "提交说明"     # 构建+部署+提交+推送
#   ./scripts/local-deploy.sh                   # 仅构建+部署（无文件改动时）
#
# 流程（任何一步失败即中止，构建不成功不会碰服务器）:
#   1. 本地构建 app/start + app/admin
#   2. rsync 同步（源码+构建产物，排除 node_modules/.git/.bun/backups）
#   3. 服务器: git 对齐 origin/main → 依赖变化时 bun install → chown → 重启 → 健康检查
#   4. 本地: git add -A + commit -m + push origin main
set -euo pipefail

SERVER="${UTTERLOG_SERVER:-root@47.83.251.61}"
KEY="${UTTERLOG_KEY:-/Volumes/文件/文稿/gentpan.pem}"
REMOTE_DIR="/opt/utterlog-v1.6.0"
SSH_CMD="ssh -i $KEY -o BatchMode=yes"
RSYNC_SSH="ssh -i $KEY -o BatchMode=yes"

MSG=""
while getopts "m:" opt; do
  case $opt in m) MSG="$OPTARG";; *) exit 1;; esac
done
cd "$(git rev-parse --show-toplevel)"

echo "── 1/4 本地构建 ──"
(cd app/start && bun run build >/dev/null)   || { echo "✗ start 构建失败"; exit 1; }
(cd app/admin && bun run build >/dev/null)   || { echo "✗ admin 构建失败"; exit 1; }
echo "✓ 构建成功"

echo "── 2/4 同步到服务器 ──"
# 依赖指纹（变化才在服务器重装）
LOCK_BEFORE=$(md5 -q bun.lock 2>/dev/null || echo none)
# --exclude .env/.runtime：服务器专属文件（符号链接与运行时目录），
# 本地仓库没有它们，不加排除会被 --delete 删掉导致服务起不来。
rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .bun --exclude backups \
  --exclude .env --exclude .runtime \
  -e "$RSYNC_SSH" ./ "$SERVER:$REMOTE_DIR/"
echo "✓ 文件已同步"

echo "── 3/4 服务器收尾 ──"
LOCK_AFTER=$(md5 -q bun.lock 2>/dev/null || echo none)
$SSH_CMD "$SERVER" bash -s "$REMOTE_DIR" "$LOCK_BEFORE" "$LOCK_AFTER" <<'EOF'
set -e
DIR="$1"; BEFORE="$2"; AFTER="$3"
cd "$DIR"
# 自愈：.env 符号链接若缺失（历史部署事故）立即恢复
[ -e .env ] || ln -sfn /opt/utterlog-shared/.env .env
git fetch origin main -q 2>/dev/null || true
git reset --hard origin/main -q 2>/dev/null || echo "（git 对齐跳过：与远程一致或无法访问）"
if [ "$BEFORE" != "$AFTER" ]; then
  echo "依赖变化，服务器 bun install…"
  sudo -u utterlog /opt/bun/bin/bun install --frozen-lockfile >/dev/null 2>&1 || sudo -u utterlog /opt/bun/bin/bun install >/dev/null
fi
chown -R utterlog:utterlog "$DIR"
systemctl restart utterlog-app.service
sleep 3
systemctl is-active --quiet utterlog-app.service || { echo "✗ 服务未启动"; exit 1; }
code=$(curl -sk -o /dev/null --resolve ficor.net:443:127.0.0.1 -w "%{http_code}" https://ficor.net/ --max-time 8)
[ "$code" = "200" ] || { echo "✗ 健康检查失败 ($code)"; exit 1; }
echo "✓ 服务重启且站点 200"
EOF
echo "✓ 部署完成"

echo "── 4/4 提交推送 GitHub ──"
if [ -n "$(git status --porcelain)" ]; then
  if [ -z "$MSG" ]; then
    echo "有未提交改动但未提供 -m 说明；已部署未提交。用 -m \"说明\" 重新运行提交。"
    git status --porcelain | head -5
    exit 0
  fi
  git add -A
  git commit -q -m "$MSG"
  git push origin main
  echo "✓ 已提交并推送: $(git log --oneline -1)"
else
  echo "✓ 无文件改动，跳过提交"
fi
echo "── 全部完成 ──"
