import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import PayablesPage from '@/pages/PayablesPage'

export const Route = createFileRoute('/payables')({
  head: () => ({
    meta: [
      { title: '應付帳款 — Engineer Lite' },
      { name: 'description', content: '管理應付帳款與付款紀錄' },
      { property: 'og:title', content: '應付帳款 — Engineer Lite' },
      { property: 'og:description', content: '管理應付帳款與付款紀錄' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <PayablesPage />
    </Layout>
  ),
})
