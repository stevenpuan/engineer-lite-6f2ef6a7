import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import DashboardPage from '@/pages/DashboardPage'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: '總覽 — Engineer Lite 工程管理系統' },
      { name: 'description', content: '工程管理系統總覽：客戶、案件與財務摘要' },
      { property: 'og:title', content: '總覽 — Engineer Lite 工程管理系統' },
      { property: 'og:description', content: '工程管理系統總覽：客戶、案件與財務摘要' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <DashboardPage />
    </Layout>
  ),
})
