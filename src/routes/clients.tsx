import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import ClientsPage from '@/pages/ClientsPage'

export const Route = createFileRoute('/clients')({
  head: () => ({
    meta: [
      { title: '客戶管理 — Engineer Lite' },
      { name: 'description', content: '管理工程客戶資料' },
      { property: 'og:title', content: '客戶管理 — Engineer Lite' },
      { property: 'og:description', content: '管理工程客戶資料' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <ClientsPage />
    </Layout>
  ),
})
