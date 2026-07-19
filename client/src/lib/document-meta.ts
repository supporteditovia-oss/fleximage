export function setDocumentMeta(options: {
  title: string;
  description: string;
  canonicalPath?: string;
  ogTitle?: string;
  ogDescription?: string;
  siteName?: string;
}): void {
  const {
    title,
    description,
    canonicalPath,
    ogTitle = title,
    ogDescription = description,
    siteName = "LuxeFlexIA",
  } = options;

  document.title = title;

  const ensureMeta = (
    selector: string,
    create: () => HTMLMetaElement,
  ): HTMLMetaElement => {
    const existing = document.querySelector(selector);
    if (existing instanceof HTMLMetaElement) return existing;
    const meta = create();
    document.head.appendChild(meta);
    return meta;
  };

  ensureMeta('meta[name="description"]', () => {
    const meta = document.createElement("meta");
    meta.name = "description";
    return meta;
  }).content = description;

  ensureMeta('meta[property="og:title"]', () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:title");
    return meta;
  }).content = ogTitle;

  ensureMeta('meta[property="og:description"]', () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:description");
    return meta;
  }).content = ogDescription;

  ensureMeta('meta[property="og:site_name"]', () => {
    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:site_name");
    return meta;
  }).content = siteName;

  if (canonicalPath) {
    const href = `https://www.luxeflexia.com${canonicalPath}`;
    let link = document.querySelector('link[rel="canonical"]');
    if (!(link instanceof HTMLLinkElement)) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.href = href;

    ensureMeta('meta[property="og:url"]', () => {
      const meta = document.createElement("meta");
      meta.setAttribute("property", "og:url");
      return meta;
    }).content = href;
  }
}
