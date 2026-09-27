import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import ModulesPage from '@/pages/admin/ModulesPage'

export const Route = createFileRoute('/admin/modules')({
  head: () => ({
    meta: [
      { title: '模組開關 — Engineer Lite' },
      { name: 'description', content: '平台模組開關管理' },
      { property: 'og:title', content: '模組開關 — Engineer Lite' },
      { property: 'og:description', content: '平台模組開關管理' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <ModulesPage />
    </Layout>
  ),
})
