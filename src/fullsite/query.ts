/** Full singleton documents are required so every fixed renderer binding remains available. */
export const sitePageQuery = '*[_type == "sitePage" && pageKey == $pageKey][0]';
export const siteSettingsQuery = '*[_type == "siteSettings" && _id == "siteSettings"][0]';
