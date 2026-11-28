<!-- 应用根组件：NuxtLayout 布局出口+NuxtPage；全局弹窗挂布局之外（登录/确认/Toast 包 ClientOnly 规避 SSR 水合差异），编辑器等独立布局也能用 -->
<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <!-- 全局弹窗：挂布局之外，编辑器等独立布局也能用 -->
  <ClientOnly>
    <AuthModal />
    <CommonConfirmModal />
    <CommonToast />
    <!-- 全站右下角悬浮反馈入口：登录用户可提交，未登录点击弹登录框后自动开反馈弹窗（登录意图 pattern） -->
    <FeedbackWidget />
  </ClientOnly>
  <CommonImageCropModal />
</template>
