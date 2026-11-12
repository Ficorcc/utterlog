#!/usr/bin/env bash
# 本地构建 → 提交推送 GitHub → 部署服务器 一体化脚本
#
# 用法:
#   ./scripts/local-deploy.sh -m "提交说明"     # 构建+提交+推送+部署
#   ./scripts/local-deploy.sh                   # 无改动时仅构建+部署
#
# 顺序关键：必须先推送再 rsync。服务器收尾时的 git reset --hard
# origin/main 只做对齐——若推送晚于 rsync，reset 会把 rsync 过去的
# 已跟踪文件改动回退掉（服务直接跑源码，等于静默丢部署）。
# 任何一步失败即中止，构建不成功不会碰服务器。
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

echo "── 2/4 提交推送 GitHub ──"
if [ -n "$(git status --porcelain)" ]; then
  if [ -z "$MSG" ]; then
    echo "✗ 有未提交改动但未提供 -m 说明（拒绝部署未入库的代码）"
    git status --porcelain | head -5
    exit 1
  fi
  git add -A
  git commit -q -m "$MSG"
  git push origin main
  echo "✓ 已提交并推送: $(git log --oneline -1)"
else
  echo "✓ 无文件改动，跳过提交"
fi

echo "── 3/4 同步到服务器 ──"
# 依赖指纹（变化才在服务器重装）
LOCK_BEFORE=$(md5 -q bun.lock 2>/dev/null || echo none)
# --exclude .env/.runtime：服务器专属文件（符号链接与运行时目录），
# 本地仓库没有它们，不加排除会被 --delete 删掉导致服务起不来。
rsync -az --delete \
  --exclude node_modules --exclude .git --exclude .bun --exclude backups \
  --exclude .env --exclude .runtime \
  -e "$RSYNC_SSH" ./ "$SERVER:$REMOTE_DIR/"
echo "✓ 文件已同步"

echo "── 4/4 服务器收尾 ──"
LOCK_AFTER=$(md5 -q bun.lock 2>/dev/null || echo none)
$SSH_CMD "$SERVER" bash -s "$REMOTE_DIR" "$LOCK_BEFORE" "$LOCK_AFTER" <<'EOF'
set -e
DIR="$1"; BEFORE="$2"; AFTER="$3"
cd "$DIR"
# 自愈：.env 符号链接若缺失（历史部署事故）立即恢复
[ -e .env ] || ln -sfn /opt/utterlog-shared/.env .env
# 对齐到刚推送的提交（rsync 内容应与之一致，reset 只是防漂移）
git fetch origin main -q 2>/dev/null || true
LOCAL_HEAD=$(git rev-parse HEAD)
REMOTE_HEAD=$(git rev-parse origin/main 2>/dev/null || echo "$LOCAL_HEAD")
if [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
  git reset --hard origin/main -q
  echo "（git 已对齐 $REMOTE_HEAD）"
fi
if [ "$BEFORE" != "$AFTER" ]; then
  echo "依赖变化，服务器 bun install…"
  sudo -u utterlog /opt/bun/bin/bun install --frozen-lockfile >/dev/null 2>&1 || sudo -u utterlog /opt/bun/bin/bun install >/dev/null
fi
chown -R utterlog:utterlog "$DIR"
# 防回退校验：部署后源码必须与 HEAD 一致（曾发生工作区被静默回退的事故）
if ! git diff --quiet; then
  echo "⚠ 警告：服务器工作区与 HEAD 不一致，可能被回退！"
  git status --porcelain | head -5
  exit 1
fi
systemctl restart utterlog-app.service
sleep 3
systemctl is-active --quiet utterlog-app.service || { echo "✗ 服务未启动"; exit 1; }
code=$(curl -sk -o /dev/null --resolve ficor.net:443:127.0.0.1 -w "%{http_code}" https://ficor.net/ --max-time 8)
[ "$code" = "200" ] || { echo "✗ 健康检查失败 ($code)"; exit 1; }
echo "✓ 服务重启且站点 200"
EOF
echo "── 全部完成 ──"
