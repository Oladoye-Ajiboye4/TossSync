import React, { useState } from 'react'
import { Icon } from '@iconify/react'

import CodeFormatModal from '../CodeFormatModal'
import BulkUploadModal from '../BulkUploadModal'

const BulkToolsTab = ({ organization, onRefresh, notify, errorNotify }) => {
  const [codeModalOpen, setCodeModalOpen] = useState(false)
  const [bulkModalOpen, setBulkModalOpen] = useState(false)

  const tools = [
    {
      key: 'code-format',
      title: 'Code Format',
      description: 'Customize how resident registration codes are generated.',
      icon: 'mdi:cog-outline',
      action: () => setCodeModalOpen(true),
      cta: 'Configure Format'
    },
    {
      key: 'bulk-upload',
      title: 'Bulk Upload',
      description: 'Import many residents at once from a CSV file.',
      icon: 'mdi:file-upload-outline',
      action: () => setBulkModalOpen(true),
      cta: 'Upload CSV'
    }
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-base font-bold text-[#5b4a3a]">Bulk Management Tools</h3>
        <p className="mt-1 text-sm text-secondary/70">Configure codes and import residents in bulk.</p>
      </div>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-2">
        {tools.map((tool) => (
          <article key={tool.key} className="flex flex-col gap-4 rounded-2xl border border-tertiary/40 bg-white p-5 shadow-sm">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary/25 text-secondary">
              <Icon icon={tool.icon} width="26" height="26" aria-hidden="true" />
            </span>
            <div>
              <h4 className="font-bold text-[#5b4a3a]">{tool.title}</h4>
              <p className="mt-1 text-sm text-secondary/70">{tool.description}</p>
            </div>
            <button
              type="button"
              onClick={tool.action}
              className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-bold text-white hover:bg-secondary/90"
            >
              <Icon icon="mdi:arrow-right-circle-outline" width="20" height="20" aria-hidden="true" />
              {tool.cta}
            </button>
          </article>
        ))}
      </div>

      <CodeFormatModal
        open={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
        currentFormat={organization.code_format}
        onSuccess={onRefresh}
        notify={notify}
        errorNotify={errorNotify}
      />

      <BulkUploadModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        onSuccess={onRefresh}
        notify={notify}
        errorNotify={errorNotify}
      />
    </div>
  )
}

export default BulkToolsTab
