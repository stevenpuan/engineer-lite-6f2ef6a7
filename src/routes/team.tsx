import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import TeamPage from '@/pages/TeamPage'

export const Route = createFileRoute('/team')({
  head: () => ({
    meta: [
      { title: '帳號管理 — Engineer Lite' },
      { name: 'description', content: '老闆管理公司內的使用者帳號' },
      { property: 'og:title', content: '帳號管理 — Engineer Lite' },
      { property: 'og:description', content: '老闆管理公司內的使用者帳號' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <TeamPage />
    </Layout>
  ),
})
