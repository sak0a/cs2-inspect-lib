import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'CS2 Inspect',
  description: 'Encode, decode and inspect Counter-Strike 2 items with TypeScript.',
  base: '/cs2-inspect-lib/',
  cleanUrls: false,
  lastUpdated: true,
  themeConfig: {
    siteTitle: 'CS2 Inspect',
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api' },
      { text: 'September update', link: '/guide/protocol' }
    ],
    sidebar: [
      { text: 'Start here', items: [
        { text: 'Getting started', link: '/guide/getting-started' },
        { text: 'Inspect links', link: '/guide/inspect-links' },
        { text: 'Creating items', link: '/guide/creating-items' },
        { text: 'Weapons & paints', link: '/guide/weapon-data' }
      ] },
      { text: 'Go further', items: [
        { text: 'Steam integration', link: '/guide/steam' },
        { text: 'Command line', link: '/guide/cli' },
        { text: 'API & configuration', link: '/api' },
        { text: 'September protocol update', link: '/guide/protocol' }
      ] }
    ],
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/sak0a/cs2-inspect-lib' }],
    editLink: { pattern: 'https://github.com/sak0a/cs2-inspect-lib/edit/master/docs/:path' },
    outline: [2, 3],
    footer: { message: 'Released under the MIT License.', copyright: 'CS2 Inspect · Community tooling for Counter-Strike 2' }
  }
})
