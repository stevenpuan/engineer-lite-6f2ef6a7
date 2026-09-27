import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import QuotesPage from '@/pages/QuotesPage'

export const Route = createFileRoute('/quotes/')({
  head: () => ({
    meta: [
      { title: '報價單 — Engineer Lite' },
      { name: 'description', content: '管理工程報價單' },
      { property: 'og:title', content: '報價單 — Engineer Lite' },
      { property: 'og:description', content: '管理工程報價單' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <QuotesPage />
    </Layout>
  ),
})
