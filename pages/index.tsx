import React, { useEffect, useState } from 'react'
import Link from 'next/link'

export default function RoomsIndex() {
  const [rooms, setRooms] = useState<Array<{ _id?: string, title: string, width: number, height: number }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/rooms')
        if (!res.ok) throw new Error('failed')
        const jd = await res.json()
        if (!mounted) return
        setRooms((jd.rooms || []).map((r: any) => ({ _id: r._id ? String(r._id) : undefined, title: r.title, width: r.width, height: r.height })))
      } catch (err: any) {
        setError(err?.message || String(err))
      }
    })()
    return () => { mounted = false }
  }, [])

  const createRoom = async () => {
    const title = prompt('Room title?')
    if (!title) return
    const wStr = prompt('Width? (number)')
    const hStr = prompt('Height? (number)')
    const w = Number(wStr); const h = Number(hStr)
    if (!w || !h) return alert('Invalid size')
    const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, width: w, height: h }) })
    if (!res.ok) return alert('failed')
    const jd = await res.json()
    setRooms(prev => [...prev, { _id: jd.rooms._id, title: jd.rooms.title, width: jd.rooms.width, height: jd.rooms.height }])
  }

  const deleteRoom = async (id?: string) => {
    if (!id) return
    if (!confirm('Delete room?')) return
    const res = await fetch(`/api/rooms?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) return alert('delete failed')
    setRooms(prev => prev.filter(r => r._id !== id))
  }

  return (
    <main style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1>Rooms</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ marginBottom: 12 }}>
        <button onClick={createRoom}>Create Room</button>
      </div>
      <ul>
        {rooms.map(r => (
              <li key={r._id} style={{ marginBottom: 8 }}>
                <strong>{r.title}</strong> — {r.width}x{r.height}
                <span style={{ marginLeft: 12 }}>
                  <Link href={`/room/${r._id}`}>Open</Link>
                </span>
                <button style={{ marginLeft: 8 }} onClick={() => deleteRoom(r._id)}>Delete</button>
              </li>
        ))}
      </ul>
      </div>
    </main>
  )
}
