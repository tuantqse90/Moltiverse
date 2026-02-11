'use client'

import { useState, useEffect } from 'react'

export default function SkillPage() {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/SKILL.MD')
      .then(res => res.text())
      .then(text => setContent(text))
      .catch(() => setContent('Failed to load SKILL.MD'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-[#e8e6e3]">
      <pre className="p-4 font-mono text-[13px] leading-[1.4] whitespace-pre-wrap break-words">
        {content}
      </pre>
    </div>
  )
}
