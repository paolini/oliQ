import React, { useEffect, useState } from 'react'

type Table = {
  id: number
  x: number
  y: number
  shape: string
  status: string
}

export default function Home() {
  const [tables, setTables] = useState<Table[]>([])
  const [queue, setQueue] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/queue/status')
      .then((r) => r.json())
      .then((data) => {
        setQueue(data.queue || [])
        setTables(data.tables || [])
      })
  }, [])

  return (
    <main style={{ padding: 16, fontFamily: 'Arial, sans-serif' }}>
      <h1>Virtual Queue — Mobile View</h1>
      <section>
        <h2>Queue</h2>
        <ol>
          {queue.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </section>
      <section>
        <h2>Tables ({tables.length})</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {tables.slice(0, 300).map((t) => (
            <div key={t.id} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 6 }}>
              <div>#{t.id}</div>
              <div>{t.shape}</div>
              <div>{t.status}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
