import { groq } from 'next-sanity';

// Selecting the full singleton intentionally preserves every nested image's
// reference, crop and hotspot data and keeps schema evolution projection-free.
export const homePageQuery = groq`*[_type == "homePage" && _id == "homePage"][0]`;

export const HOME_PAGE_QUERY_IS_FULL_DOCUMENT = true as const;
