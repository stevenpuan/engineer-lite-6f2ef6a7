import { createFileRoute } from '@tanstack/react-router'
import LoginPage from '@/pages/LoginPage'

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: '登入 — Engineer Lite 工程管理系統' },
      { name: 'description', content: '登入 Engineer Lite 工程管理系統' },
      { property: 'og:title', content: '登入 — Engineer Lite 工程管理系統' },
      { property: 'og:description', content: '登入 Engineer Lite 工程管理系統' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: LoginPage,
})
