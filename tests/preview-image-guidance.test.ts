import assert from 'node:assert/strict';
import test from 'node:test';
import { getSitePageImageGuidance, IMAGE_GUIDANCE } from '../src/sanity/imageGuidance';

test('site page image guidance adapts to fixed legacy page image slots', () => {
  const gallery = getSitePageImageGuidance('assets/custom-socks-editorial-v1.webp', '图片 · Image Viewer');
  assert.match(gallery, /1200×1200 px（1:1）/);
  assert.match(gallery, /单张图片/);

  const sprite = getSitePageImageGuidance('assets/custom-socks-editorial-v2.webp', '图片 · Editorial content');
  assert.match(sprite, /多图拼版/);
  assert.match(sprite, /1600×1200 px（4:3）/);
  assert.match(sprite, /不要把整张拼版/);

  const banner = getSitePageImageGuidance('assets/banner-new.webp', '图片 · All Products');
  assert.match(banner, /2172×724 px/);
});

test('Sanity image guidance stays advisory and explains common page image frames', () => {
  assert.match(IMAGE_GUIDANCE.sitePage, /1600×1200 px（4:3）/);
  assert.match(IMAGE_GUIDANCE.sitePage, /1200×1200 px（1:1）/);
  assert.match(IMAGE_GUIDANCE.sitePage, /预览中的实际裁切/);
  assert.match(IMAGE_GUIDANCE.product, /1200×1200 px（1:1）/);
  assert.match(IMAGE_GUIDANCE.socialShare, /1200×630 px/);
});
