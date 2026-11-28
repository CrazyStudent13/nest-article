<template>
  <div class="tools-container">
    <div class="tools-header">
      <h2 class="tools-title">服务工具导航</h2>
      <p class="tools-desc">接口文档与实用工具集合</p>
    </div>

    <!-- 三入口卡片：链接同源直出（nginx 静态托管 + /api/openapi.json live spec），新窗口打开 -->
    <el-row :gutter="16">
      <el-col v-for="tool in tools" :key="tool.title" :xs="24" :sm="8">
        <el-card class="tool-card" shadow="hover">
          <div class="tool-body">
            <el-icon :size="40" class="tool-icon" :style="{ color: tool.iconColor }">
              <component :is="tool.icon" />
            </el-icon>
            <div class="tool-info">
              <h3 class="tool-title">{{ tool.title }}</h3>
              <p class="tool-desc">{{ tool.desc }}</p>
            </div>
            <el-button :type="tool.buttonType" :icon="TopRight" class="tool-btn" @click="open(tool.url)">
              查看
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup name="Swagger">
import { Promotion, Document, Link, TopRight } from '@element-plus/icons-vue';

// 三个入口均由管理端 nginx 同源直出：
// - /swagger-ui/ 与 /docs：nginx 静态页（资产本地入库），规格读 /api/openapi.json live 输出
// - /api/openapi.json：经 ^~ /api/ 反代到服务端实时生成的 OpenAPI 规范（Apifox 导入用，随 swagger.enable 开关）
const tools = [
  {
    title: 'Swagger UI',
    desc: '交互式 API 文档，支持在线调试',
    icon: Promotion,
    iconColor: '#409eff',
    buttonType: 'primary',
    url: '/swagger-ui/'
  },
  {
    title: 'Redoc 文档',
    desc: '美观的 API 文档展示，易于阅读',
    icon: Document,
    iconColor: '#67c23a',
    buttonType: 'success',
    url: '/docs'
  },
  {
    title: 'Apifox 导入',
    desc: 'OpenAPI 规范文件，支持导入 Apifox',
    icon: Link,
    iconColor: '#e6a23c',
    buttonType: 'warning',
    url: '/api/openapi.json'
  }
];

const open = (url) => {
  window.open(url, '_blank');
};
</script>

<style lang="scss" scoped>
.tools-container {
  padding: 20px;

  .tools-header {
    text-align: center;
    margin-bottom: 24px;

    .tools-title {
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      color: #303133;
    }

    .tools-desc {
      margin: 8px 0 0;
      font-size: 14px;
      color: #909399;
    }
  }

  .tool-card {
    border-radius: 8px;
    margin-bottom: 16px;

    .tool-body {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 4px;

      .tool-icon {
        flex-shrink: 0;
      }

      .tool-info {
        flex: 1;
        min-width: 0;

        .tool-title {
          margin: 0 0 6px;
          font-size: 16px;
          font-weight: 600;
          color: #303133;
        }

        .tool-desc {
          margin: 0;
          font-size: 13px;
          color: #909399;
        }
      }

      .tool-btn {
        flex-shrink: 0;
      }
    }
  }
}
</style>
