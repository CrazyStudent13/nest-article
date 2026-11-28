# monorepo 版：构建上下文为仓库根目录（见根 docker-compose.yml 的 build.context）
# NPM_REGISTRY 可在构建时覆盖（GitHub Actions 海外构建机用官方源更快，本地默认腾讯源不变）
ARG NPM_REGISTRY=https://mirrors.cloud.tencent.com/npm/

# 第一阶段：安装全部依赖并构建（nest-cli.json 的 assets 会把 src/config/env/*.yml 复制进 dist）
FROM node:22-bookworm-slim AS builder
ARG NPM_REGISTRY

WORKDIR /app

# 安装 pnpm（与根 package.json 的 packageManager 一致）
RUN npm install -g pnpm@10.33.0 --registry=$NPM_REGISTRY

# 先拷依赖清单（利用 Docker 层缓存），再按过滤安装
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/utils/package.json ./packages/utils/

# 过滤安装需同时选中 workspace 依赖包：--filter 只装被选项目的 devDeps，workspace 依赖包也不例外
RUN pnpm install --frozen-lockfile --filter server --filter @nest-acticle/shared --filter @nest-acticle/utils --registry=$NPM_REGISTRY

COPY apps/server ./apps/server
COPY packages/shared ./packages/shared
COPY packages/utils ./packages/utils

# pnpm -r 按拓扑序构建：先 workspace 依赖 @nest-acticle/shared 与 @nest-acticle/utils
# （供 nest build 解析类型与运行时 require，password.ts 等引用 utils），再 server 本体
WORKDIR /app
RUN pnpm -r build

# 第二阶段：只装生产依赖 + 构建产物（不带 devDependencies，镜像瘦身以适配 ghcr 私有免费额度）
FROM node:22-bookworm-slim
ARG NPM_REGISTRY

WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/server/package.json ./apps/server/
COPY packages/shared/package.json ./packages/shared/
COPY packages/utils/package.json ./packages/utils/

# 装完即卸载 pnpm 并清缓存：运行阶段用不到，同层清理才能省体积
RUN npm install -g pnpm@10.33.0 --registry=$NPM_REGISTRY \
    && pnpm install --frozen-lockfile --prod --filter server --registry=$NPM_REGISTRY \
    && pnpm store prune \
    && npm uninstall -g pnpm \
    && npm cache clean --force

# server 运行时 require @nest-acticle/shared 与 @nest-acticle/utils：
# node_modules 符号链接指向 packages/*，需带上各自的构建产物
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/utils/package.json ./packages/utils/package.json
COPY --from=builder /app/packages/utils/dist ./packages/utils/dist

COPY --from=builder /app/apps/server/dist ./apps/server/dist

# 工作目录即 apps/server：dist/env 的 yml、./upload 上传目录、./logs 均相对此目录
WORKDIR /app/apps/server
EXPOSE 8080

CMD ["node", "dist/main"]