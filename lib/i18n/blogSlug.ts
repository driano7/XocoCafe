/*
 * --------------------------------------------------------------------
 *  Xoco Café — Software Property
 * --------------------------------------------------------------------
 */

type Translator = (path: string) => string;

export const getLocalizedBlogSlug = (slugKey: string, translate: Translator) => {
  if (!slugKey) {
    return slugKey;
  }
  const translationKey = `blog.slug_${slugKey}`;
  const localizedSlug = translate(translationKey);
  return localizedSlug && localizedSlug !== translationKey ? localizedSlug : slugKey;
};

export const buildLocalizedBlogHref = (href: string, translate: Translator) => {
  if (!href.startsWith('/blog/')) {
    return href;
  }
  const [, slugKey] = href.split('/blog/');
  if (!slugKey || slugKey.includes('/')) {
    return href;
  }
  return `/blog/${getLocalizedBlogSlug(slugKey, translate)}`;
};
