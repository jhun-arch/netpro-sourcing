export function validateSafeHref(value: unknown): true | string {
  if (typeof value !== 'string' || !value.trim()) return '请输入有效链接。';
  const href = value.trim();
  if (/^(?:javascript|data|vbscript):/i.test(href) || href.startsWith('//') || href.startsWith('\\\\')) {
    return '请使用站内路径、锚点、https、mailto 或 tel 链接。';
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^(?:https:|mailto:|tel:)/i.test(href)) {
    return '链接协议仅支持 https、mailto 或 tel。';
  }
  if (/[\u0000-\u0020\\]/.test(href)) return '链接不能包含空格、反斜线或控制字符。';
  return true;
}
