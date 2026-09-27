import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import ProjectsPage from '@/pages/ProjectsPage'

export const Route = createFileRoute('/projects/')({
  head: () => ({
    meta: [
      { title: '案件管理 — Engineer Lite' },
      { name: 'description', content: '管理工程案件與進度' },
      { property: 'og:title', content: '案件管理 — Engineer Lite' },
      { property: 'og:description', content: '管理工程案件與進度' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <ProjectsPage />
    </Layout>
  ),
})
