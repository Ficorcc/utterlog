#!/usr/bin/env bash
# ============================================================
# deploy-ficor.sh — 43.161.221.122 /opt/utterlog-ficor 部署
#
# 部署形态（scout 已确认）：
#   - 路径 /opt/utterlog-ficor，Docker Compose 部署
#   - 容器 utterlog-ficor-app 跑 utterlog-app:local 镜像
#   - compose: docker-compose.bun.yml（app + postgres）
#   - 数据卷 ./pgdata ./uploads ./content ./.env 需保留
#
# 流程（本地无 Docker → 服务器构建）：
#   1. 本地 preflight（typecheck + admin/blog build），构建产物在 dist/
#   2. git archive HEAD 源码 + 叠加 dist/ 构建产物 → 上传 src/
#   3. 服务器 docker build（用 Dockerfile.bun）→ 打 utterlog-app:local + :<sha>
#   4. docker compose up -d --force-recreate --no-deps app（只重启 app，不动 db）
#   5. 健康检查 + revision 校验
#
# 用法：
#   bash scripts/deploy-ficor.sh scout        # 仅侦察（只读）
#   bash scripts/deploy-ficor.sh              # 标准部署
#   bash scripts/deploy-ficor.sh --skip-build # 跳过本地 preflight（产物已构建）
#
# 环境变量（可覆盖）：
#   UTTERLOG_DEPLOY_HOST   默认 43.161.221.122
#   UTTERLOG_DEPLOY_USER   默认 root
#   UTTERLOG_DEPLOY_PATH   默认 /opt/utterlog-ficor
#   UTTERLOG_SSH_KEY       默认 ~/Desktop/网站/ficor.net/gentpan.pem
#   UTTERLOG_IMAGE_NAME    默认 utterlog-app
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

HOST="${UTTERLOG_DEPLOY_HOST:-43.161.221.122}"
USER="${UTTERLOG_DEPLOY_USER:-root}"
REMOTE_PATH="${UTTERLOG_DEPLOY_PATH:-/opt/utterlog-ficor}"
IMAGE_NAME="${UTTERLOG_IMAGE_NAME:-utterlog-app}"
GIT_SHA="$(git rev-parse HEAD)"
GIT_SHA_SHORT="$(git rev-parse --short HEAD)"
GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

SKIP_BUILD=0
SCOUT_ONLY=0
for arg in "$@"; do
  case "$arg" in
    scout) SCOUT_ONLY=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "未知参数: $arg（可用 scout / --skip-build）" >&2; exit 1 ;;
  esac
done

if [ -t 1 ]; then
  C_BLUE=$'\e[34m'; C_GREEN=$'\e[32m'; C_YELLOW=$'\e[33m'
  C_RED=$'\e[31m'; C_BOLD=$'\e[1m'; C_RESET=$'\e[0m'
else
  C_BLUE=; C_GREEN=; C_YELLOW=; C_RED=; C_BOLD=; C_RESET=
fi
log()  { printf "%s==>%s %s\n" "$C_BLUE$C_BOLD" "$C_RESET" "$*"; }
ok()   { printf "%s✓%s %s\n" "$C_GREEN$C_BOLD" "$C_RESET" "$*"; }
warn() { printf "%s!%s %s\n" "$C_YELLOW$C_BOLD" "$C_RESET" "$*"; }
err()  { printf "%s✗%s %s\n" "$C_RED$C_BOLD" "$C_RESET" "$*" >&2; }

resolve_ssh_key() {
  if [ -n "${UTTERLOG_SSH_KEY:-}" ] && [ -f "$UTTERLOG_SSH_KEY" ]; then echo "$UTTERLOG_SSH_KEY"; return; fi
  for candidate in \
    "$HOME/Desktop/网站/ficor.net/gentpan.pem" \
    "$HOME/Desktop/gentpan.pem" \
    "$HOME/.ssh/gentpan.pem"; do
    if [ -f "$candidate" ]; then echo "$candidate"; return; fi
  done
  err "找不到 SSH 私钥 gentpan.pem"
  exit 1
}

SSH_KEY="$(resolve_ssh_key)"
chmod 600 "$SSH_KEY" 2>/dev/null || true
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20)
SSH=(ssh "${SSH_OPTS[@]}" "${USER}@${HOST}")
RSYNC_SSH=(ssh "${SSH_OPTS[@]}")

# -------- scout: 探测服务器结构（只读） --------
scout() {
  log "侦察 ${USER}@${HOST}:${REMOTE_PATH} ..."
  "${SSH[@]}" bash -s <<'EOF'
set +e
echo "===== HOST ====="
hostname; uname -m; cat /etc/os-release 2>/dev/null | grep -E "^(NAME|VERSION)=" | head -2
echo "===== target dir ====="
REMOTE_PATH="${UTTERLOG_DEPLOY_PATH:-/opt/utterlog-ficor}"
ls -la "$REMOTE_PATH" 2>/dev/null | head -25
echo "===== docker ps (utterlog) ====="
docker ps --format "{{.Names}}|{{.Image}}|{{.Status}}" 2>/dev/null | grep -iE "utterlog|postgres" || echo "(none)"
echo "===== running revision ====="
docker exec utterlog-ficor-app cat /app/.deploy-revision 2>/dev/null || echo "(unknown)"
echo "===== bun ====="
command -v bun && bun --version || echo "(no bun)"
echo "===== compose files ====="
ls "$REMOTE_PATH"/docker-compose*.yml 2>/dev/null
EOF
}

# -------- SSH 可达性 --------
log "测试 SSH 连通性 ..."
if "${SSH[@]}" 'echo CONNECTED' >/dev/null 2>&1; then
  ok "SSH 可达"
else
  err "SSH 连不上 ${HOST}"
  exit 1
fi

if [ "$SCOUT_ONLY" -eq 1 ]; then
  scout
  exit 0
fi

log "部署目标: ${USER}@${HOST}:${REMOTE_PATH}"
log "Git: ${GIT_BRANCH} @ ${GIT_SHA_SHORT}"

# -------- preflight --------
if [ "$SKIP_BUILD" -eq 0 ]; then
  log "检查工作区干净"
  if [ -n "$(git status --porcelain)" ]; then
    err "工作区有未提交改动，请先 commit"
    git status --short
    exit 1
  fi

  export PATH="$HOME/.bun/bin:$PATH"
  log "Preflight: bun install --frozen-lockfile"
  bun install --frozen-lockfile
  log "Preflight: server typecheck"
  bun run server:check
  log "Preflight: admin build"
  (cd app/admin && bun run build)
  log "Preflight: blog client + themes"
  bun run build:blog-client
  bun run build:web
  ok "Preflight 通过"
else
  warn "跳过本地 preflight（--skip-build）"
fi

# 确认构建产物存在
for f in app/admin/dist/index.html app/blog/dist/client.js; do
  if [ ! -f "$f" ]; then
    err "缺少构建产物 $f —— 去掉 --skip-build 重跑"
    exit 1
  fi
done

# -------- 打包源码 + 构建产物 --------
log "打包源码 (git archive HEAD) + 叠加 dist/ ..."
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT
git archive HEAD | tar xf - -C "$STAGING"

# dist/ 被 .gitignore 排除，git archive 会漏，单独叠加
mkdir -p "$STAGING/app/admin/dist" "$STAGING/app/blog/dist"
rsync -a --delete app/admin/dist/ "$STAGING/app/admin/dist/"
rsync -a --delete app/blog/dist/  "$STAGING/app/blog/dist/"

# -------- 上传到 src/ --------
log "上传源码到 ${REMOTE_PATH}/src/ ..."
"${SSH[@]}" "rm -rf ${REMOTE_PATH}/src && mkdir -p ${REMOTE_PATH}/src"
rsync -azp --delete \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='uploads' \
  --exclude='pgdata' \
  --exclude='redisdata' \
  -e "${RSYNC_SSH[*]}" \
  "$STAGING/" "${USER}@${HOST}:${REMOTE_PATH}/src/"
ok "源码上传完成"

# -------- 服务器 docker build --------
log "服务器: docker build（linux/amd64 原生，无需跨平台）..."
"${SSH[@]}" bash -s <<EOF
set -euo pipefail
cd ${REMOTE_PATH}

# 备份当前镜像 tag（便于回滚）
docker tag ${IMAGE_NAME}:local ${IMAGE_NAME}:backup-\$(date +%Y%m%d%H%M%S) 2>/dev/null || true

cd src
echo "===> docker build -t ${IMAGE_NAME}:local -t ${IMAGE_NAME}:${GIT_SHA_SHORT}"
docker build \
  --build-arg GIT_SHA=${GIT_SHA} \
  --build-arg GIT_BRANCH=${GIT_BRANCH} \
  -f Dockerfile.bun \
  -t ${IMAGE_NAME}:local \
  -t ${IMAGE_NAME}:${GIT_SHA_SHORT} \
  .
EOF
ok "镜像构建完成: ${IMAGE_NAME}:local, ${IMAGE_NAME}:${GIT_SHA_SHORT}"

# -------- 重启 app 容器（不动 postgres） --------
# compose 默认用 ghcr.io 镜像 + pull_policy:always，会拉公共镜像而不是本地 build 的。
# 写一个 override 文件强制用 utterlog-app:local + pull_policy:never，叠加到 -f 之后。
log "配置 compose override（用本地镜像）+ 重启 app ..."
"${SSH[@]}" bash -s <<EOF
set -euo pipefail
cd ${REMOTE_PATH}
cat > docker-compose.local.yml << 'YAML'
# 本地构建镜像 override —— 部署脚本自动生成，让 compose 用 utterlog-app:local
services:
  app:
    image: utterlog-app:local
    pull_policy: never
YAML
# 仅 force-recreate app，依赖的 postgres 不重启
docker compose -f docker-compose.bun.yml -f docker-compose.local.yml up -d --force-recreate --no-deps app
EOF
ok "app 容器已重启（使用 utterlog-app:local）"

# -------- 健康检查 --------
log "健康检查 ..."
sleep 6
if "${SSH[@]}" 'docker exec utterlog-ficor-app wget -qO- http://127.0.0.1:8080/api/v1/install/status >/dev/null 2>&1 || curl -sf -m 10 http://127.0.0.1:9260/api/v1/install/status >/dev/null' 2>/dev/null; then
  ok "API 健康检查通过"
else
  warn "API 健康检查未通过 —— 看日志:"
  warn "  ssh ... 'docker logs utterlog-ficor-app --tail 50'"
fi

# revision 校验
RUNNING_REV="$("${SSH[@]}" "docker exec utterlog-ficor-app cat /app/.deploy-revision 2>/dev/null || echo unknown")"
ok "部署完成"
ok "本地 revision:  ${GIT_SHA_SHORT} (${GIT_SHA})"
ok "容器 revision:  ${RUNNING_REV:0:7} (${RUNNING_REV})"
if [ "$RUNNING_REV" = "$GIT_SHA" ]; then
  ok "✅ revision 三端一致"
else
  warn "revision 不匹配 —— 容器可能用的旧镜像，检查 docker build 输出"
fi
