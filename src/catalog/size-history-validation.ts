export function validateSizeHistory(input: {
  value: unknown;
  sourceSizes?: unknown;
  currentSizes?: unknown;
  publishedSizes?: unknown;
}): true | string {
  const value = Array.isArray(input.value) ? input.value.filter((item): item is string => typeof item === 'string') : [];
  const sourceSizes = Array.isArray(input.sourceSizes) ? input.sourceSizes.filter((item): item is string => typeof item === 'string') : [];
  const currentSizes = Array.isArray(input.currentSizes) ? input.currentSizes.filter((item): item is string => typeof item === 'string') : [];
  const publishedSizes = Array.isArray(input.publishedSizes) ? input.publishedSizes.filter((item): item is string => typeof item === 'string') : [];
  const missing = [...new Set([...sourceSizes, ...publishedSizes, ...currentSizes])].filter((size) => !value.includes(size));
  return missing.length
    ? `不能移除当前或曾发布过的尺码；如新增当前尺码，请先追加历史尺码：${missing.join('、')}`
    : true;
}
