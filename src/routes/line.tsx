import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import LineBindingPage from '@/pages/LineBindingPage'

export const Route = createFileRoute('/line')({
  head: () => ({
    meta: [
      { title: 'LINE 綁定 — Engineer Lite' },
      { name: 'description', content: '綁定 LINE 助手' },
      { property: 'og:title', content: 'LINE 綁定 — Engineer Lite' },
      { property: 'og:description', content: '綁定 LINE 助手' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <LineBindingPage />
    </Layout>
  ),
})
