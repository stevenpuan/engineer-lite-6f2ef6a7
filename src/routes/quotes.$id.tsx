import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import QuoteDetailPage from '@/pages/QuoteDetailPage'

export const Route = createFileRoute('/quotes/$id')({
  head: () => ({
    meta: [
      { title: '報價單明細 — Engineer Lite' },
      { name: 'description', content: '檢視與編輯報價單項目' },
      { property: 'og:title', content: '報價單明細 — Engineer Lite' },
      { property: 'og:description', content: '檢視與編輯報價單項目' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <QuoteDetailPage />
    </Layout>
  ),
})
