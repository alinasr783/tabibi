import { useEffect } from 'react'

function setMetaTag(name, content, attr = 'name') {
  if (!content) return
  // prefer meta[attr="name"] selector
  let el = document.querySelector(`meta[${attr}='${name}']`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, name)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export default function usePageMeta({ title, description, image, url, canonical, jsonLd, robots, siteName, type, locale }) {
  useEffect(() => {
    if (title) document.title = title

    setMetaTag('description', description)
    setMetaTag('og:title', title, 'property')
    setMetaTag('og:description', description, 'property')
    setMetaTag('og:image', image, 'property')
    setMetaTag('og:url', url, 'property')
    setMetaTag('og:site_name', siteName, 'property')
    setMetaTag('og:type', type, 'property')
    setMetaTag('og:locale', locale, 'property')
    setMetaTag('twitter:card', image ? 'summary_large_image' : 'summary', 'name')
    setMetaTag('twitter:title', title, 'name')
    setMetaTag('twitter:description', description, 'name')
    setMetaTag('twitter:image', image, 'name')
    setMetaTag('twitter:url', url, 'name')
    setMetaTag('robots', robots || 'index,follow')

    if (canonical) {
      let link = document.querySelector("link[rel='canonical']")
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'canonical')
        document.head.appendChild(link)
      }
      link.setAttribute('href', canonical)
    }

    if (jsonLd) {
      let script = document.querySelector("script#page-jsonld[type='application/ld+json']")
      if (!script) {
        script = document.createElement('script')
        script.setAttribute('type', 'application/ld+json')
        script.setAttribute('id', 'page-jsonld')
        document.head.appendChild(script)
      }
      try {
        script.text = JSON.stringify(jsonLd)
      } catch (e) {
        script.text = String(jsonLd)
      }
    }

    // cleanup is intentionally omitted because we want meta persistence across navigation
  }, [title, description, image, url, canonical, JSON.stringify(jsonLd), robots, siteName, type, locale])
}
