import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import ReceivablesPage from '@/pages/ReceivablesPage'

export const Route = createFileRoute('/receivables')({
  head: () => ({
    meta: [
      { title: '收款管理 — Engineer Lite' },
      { name: 'description', content: '管理應收帳款與收款紀錄' },
      { property: 'og:title', content: '收款管理 — Engineer Lite' },
      { property: 'og:description', content: '管理應收帳款與收款紀錄' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <ReceivablesPage />
    </Layout>
  ),
})
