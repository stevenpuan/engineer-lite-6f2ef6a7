import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import ExpensesPage from '@/pages/ExpensesPage'

export const Route = createFileRoute('/expenses')({
  head: () => ({
    meta: [
      { title: '雜支支出 — Engineer Lite' },
      { name: 'description', content: '管理工程支出與費用報支' },
      { property: 'og:title', content: '雜支支出 — Engineer Lite' },
      { property: 'og:description', content: '管理工程支出與費用報支' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <ExpensesPage />
    </Layout>
  ),
})
