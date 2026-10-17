export const catalogProductsQuery = `*[_type == "product"] | order(sortOrder asc, productId asc) {
  _id, _rev, productId, name, "categoryId": category->categoryId,
  currentSizes, legacySizes, sourceSizes, color, swatch, isNew, active, sortOrder,
  description, customizationHref, externalCustomizationHref,
  image { ..., "asset": asset->{_id, url}, "assetRef": asset._ref },
  legacyImageAssetRef, imageAlt, imageSize, position,
  hoverImage { ..., "asset": asset->{_id, url}, "assetRef": asset._ref },
  legacyHoverImageAssetRef, hoverImageAlt, hoverImageSize, hoverImagePosition, art
}`;

export const catalogCategoriesQuery = `*[_type == "productCategory"] | order(sortOrder asc, categoryId asc) {
  _id, _rev, categoryId, label, styleLabel, sortOrder, active, showStyleReferences,
  banner { ..., "asset": asset->{_id, url}, "assetRef": asset._ref }, legacyBannerAssetRef, bannerAlt
}`;

export const catalogStylesQuery = `*[_type == "catalogStyle"] | order(category->sortOrder asc, sortOrder asc, styleId asc) {
  _id, _rev, styleId, name, "categoryId": category->categoryId, href,
  image { ..., "asset": asset->{_id, url}, "assetRef": asset._ref },
  legacyImageAssetRef, position, size, alt, sortOrder, active
}`;

export const catalogQueries = {
  product: catalogProductsQuery,
  category: catalogCategoriesQuery,
  style: catalogStylesQuery,
} as const;
