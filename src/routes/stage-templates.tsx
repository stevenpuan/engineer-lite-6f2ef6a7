import { createFileRoute } from '@tanstack/react-router'
import { Layout } from '@/components/Layout'
import StageTemplatesPage from '@/pages/StageTemplatesPage'

export const Route = createFileRoute('/stage-templates')({
  head: () => ({
    meta: [
      { title: '階段範本 — Engineer Lite' },
      { name: 'description', content: '管理本店的施工階段範本' },
      { property: 'og:title', content: '階段範本 — Engineer Lite' },
      { property: 'og:description', content: '管理本店的施工階段範本' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: () => (
    <Layout>
      <StageTemplatesPage />
    </Layout>
  ),
})
