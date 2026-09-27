import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import UsersPage from '@/pages/admin/UsersPage'

export const Route = createFileRoute('/admin/users')({
  head: () => ({
    meta: [
      { title: '使用者管理 — Engineer Lite' },
      { name: 'description', content: '平台使用者管理' },
      { property: 'og:title', content: '使用者管理 — Engineer Lite' },
      { property: 'og:description', content: '平台使用者管理' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <UsersPage />
    </Layout>
  ),
})
