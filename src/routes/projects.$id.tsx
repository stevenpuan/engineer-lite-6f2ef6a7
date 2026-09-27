import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import ProjectDetailPage from '@/pages/ProjectDetailPage'

export const Route = createFileRoute('/projects/$id')({
  head: () => ({
    meta: [
      { title: '案件明細 — Engineer Lite' },
      { name: 'description', content: '檢視工程案件明細、報價與收支' },
      { property: 'og:title', content: '案件明細 — Engineer Lite' },
      { property: 'og:description', content: '檢視工程案件明細、報價與收支' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <ProjectDetailPage />
    </Layout>
  ),
})
