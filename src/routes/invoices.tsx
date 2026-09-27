import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import InvoicesPage from '@/pages/InvoicesPage'

export const Route = createFileRoute('/invoices')({
  head: () => ({
    meta: [
      { title: '發票與稅務 — Engineer Lite' },
      { name: 'description', content: '銷項與進項發票登記、營業稅期別統計' },
      { property: 'og:title', content: '發票與稅務 — Engineer Lite' },
      { property: 'og:description', content: '銷項與進項發票登記、營業稅期別統計' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <InvoicesPage />
    </Layout>
  ),
})
