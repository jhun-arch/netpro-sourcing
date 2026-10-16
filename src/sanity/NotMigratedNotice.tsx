import type { UserComponent } from 'sanity/structure';

export const NotMigratedNotice: UserComponent = () => (
  <main style={{ maxWidth: 760, margin: '64px auto', padding: '0 24px', lineHeight: 1.7 }}>
    <h1>页面尚未迁移</h1>
    <p>About 与 Customization 页面仍由现有静态文件维护，本次实验只开放首页编辑。</p>
    <p>此入口仅用于说明迁移范围，不代表这些页面已连接 Sanity。</p>
  </main>
);
