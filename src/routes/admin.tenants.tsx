import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import TenantsPage from '@/pages/admin/TenantsPage'

export const Route = createFileRoute('/admin/tenants')({
  head: () => ({
    meta: [
      { title: '租戶管理 — Engineer Lite' },
      { name: 'description', content: '平台租戶管理' },
      { property: 'og:title', content: '租戶管理 — Engineer Lite' },
      { property: 'og:description', content: '平台租戶管理' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <TenantsPage />
    </Layout>
  ),
})
