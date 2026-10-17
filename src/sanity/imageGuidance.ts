export const IMAGE_GUIDANCE = {
  homeHero: '建议约 1920×1080 px（16:9）。首屏会铺满画面并裁切边缘，重要主体请留在中央安全区，上传后以预览为准。',
  homeCategory: '建议 1600×1200 px（4:3）。分类图会填充横向内容面板，主体请避开边缘，最终以预览裁切为准。',
  homeProcess: '建议 1600×1200 px（4:3）。步骤图按横向画框裁切，重要内容请留在中央。',
  homeStartingPoint: '建议 1600×1200 px（4:3）。入口卡片会裁切图片以填满画框，上传后请检查预览中的主体位置。',
  homeGallery: '建议 1200×1200 px（1:1）。图库卡片高度不同，会按卡片画框裁切；请检查预览。',
  socialShare: '建议 1200×630 px（约 1.91:1），适用于社交分享预览。',
  sitePageBackground: '建议 1920×1080 px（16:9），适用于页面首屏或背景图。背景会铺满画框并裁切边缘，请检查预览中的主体位置。',
  sitePage: '页面图片建议长边至少 1600 px：常规模块图可用 1600×1200 px（4:3），宽幅横幅可用 1920×900 px（约 2.1:1），方形卡片可用 1200×1200 px（1:1）。此旧页面沿用固定画框，请以预览中的实际裁切为准；若原素材是多图拼版，请替换为单张图片。',
  product: '建议 1200×1200 px（1:1）。产品卡片与详情模态框使用方形画框，上传后请检查预览主体位置。',
  productHover: '建议 1200×1200 px（1:1），并与产品主图保持相近构图；悬停时会填满方形卡片。',
  categoryBanner: '建议 2172×724 px（约 3:1），适用于宽幅分类横幅；主体请留在中央安全区，最终以预览裁切为准。',
  styleCard: '建议 1200×1200 px（1:1）。风格卡片使用方形画框，上传后请检查预览主体位置。',
  sitePageGallery: '这是图片画廊中的单张预览图，建议 1200×1200 px（1:1）；请上传单张图片，不要上传原多图拼版素材。',
  sitePageSpriteReplacement: '该页面原图使用多图拼版素材。替换时请上传对应的一张独立图片，不要把整张拼版当作单张图片；建议 1600×1200 px（4:3）或 1200×1200 px（1:1），并以预览中的固定画框裁切为准。',
} as const;

export function getSitePageImageGuidance(sourcePath: unknown, label: unknown): string {
  const source = typeof sourcePath === 'string' ? sourcePath.toLowerCase() : '';
  const fieldLabel = typeof label === 'string' ? label.toLowerCase() : '';
  if (source.includes('-editorial-v1.') && fieldLabel.includes('image viewer')) return IMAGE_GUIDANCE.sitePageGallery;
  if (source.includes('-editorial-v2.')) return IMAGE_GUIDANCE.sitePageSpriteReplacement;
  if (/banner/.test(source) || /横幅/.test(fieldLabel)) {
    return IMAGE_GUIDANCE.categoryBanner;
  }
  if (/hero|contact-studio/.test(source) || /首屏背景|页面背景/.test(fieldLabel)) return IMAGE_GUIDANCE.sitePageBackground;
  return IMAGE_GUIDANCE.sitePage;
}
