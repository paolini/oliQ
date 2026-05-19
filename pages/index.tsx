import React, { useEffect, useState } from 'react'
import RoomMap from '../components/RoomMap'

type Table = {
  _id?: string
  participant_ids?: number[]
  x: number
  y: number
  shape?: 'square' | 'circle'
  rotation?: number
}

export default function Home() {
  const [tables, setTables] = useState<Table[]>([])
  const [queue, setQueue] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleTableClick = (id?: string) => {
    alert('Table ' + (id || ''))
  }

  const [gridMode, setGridMode] = useState(false)
  const [gridShape, setGridShape] = useState<'square' | 'circle'>('square')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [roomWidth, setRoomWidth] = useState<number | undefined>(800)
  const [roomHeight, setRoomHeight] = useState<number | undefined>(600)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/tables')
        if (!res.ok) {
          const txt = await res.text().catch(() => 'failed to load')
          setError(`Failed to load tables: ${txt}`)
          return
        }
        const data = await res.json()
        if (!mounted) return
        setError(null)
        const docs = data.tables || []
        const mapped: Table[] = docs.map((t: any, i: number) => ({
          _id: t._id ? String(t._id) : undefined,
          participant_ids: Array.isArray(t.participant_ids) ? t.participant_ids.map(Number) : [],
          x: Number(t.x) || 0,
          y: Number(t.y) || 0,
          shape: t.shape === 'circle' ? 'circle' : 'square',
          rotation: typeof t.rotation === 'number' ? t.rotation : undefined,
        }))
        setTables(mapped)
      } catch (err: any) {
        console.error('failed to load tables', err)
        setError(err?.message || String(err))
      }
    })()
    return () => { mounted = false }
  }, [])

  const selectTablesInRect = (rect: { x1: number; y1: number; x2: number; y2: number }) => {
    const x = Math.min(rect.x1, rect.x2)
    const y = Math.min(rect.y1, rect.y2)
    const w = Math.abs(rect.x2 - rect.x1)
    const h = Math.abs(rect.y2 - rect.y1)
    const ids = tables.filter(t => t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h).map(t => t.id)
    setSelectedIds(ids)
  }

  const handleSelectionComplete = async (rect: { x1: number; y1: number; x2: number; y2: number }) => {
    if (!gridMode) {
      selectTablesInRect(rect)
      return
    }
    const rowsStr = prompt('Number of rows?')
    const colsStr = prompt('Number of columns?')
    if (!rowsStr || !colsStr) return
    const rows = Number(rowsStr)
    const cols = Number(colsStr)
    if (!rows || !cols) return alert('Invalid rows/cols')

    const x = Math.min(rect.x1, rect.x2)
    const y = Math.min(rect.y1, rect.y2)
    const w = Math.abs(rect.x2 - rect.x1)
    const h = Math.abs(rect.y2 - rect.y1)

    const cellW = w / Math.max(1, cols)
    const cellH = h / Math.max(1, rows)

    const maxId = tables.reduce((m, t) => Math.max(m, t.id || 0), 0)
    const newTables: Table[] = []
    let nextId = maxId + 1
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x + (c + 0.5) * cellW
        const cy = y + (r + 0.5) * cellH
        const tbl = { id: nextId++, x: Math.round(cx), y: Math.round(cy), shape: gridShape, status: 'normal' }
        newTables.push(tbl)
      }
    }

    // optimistic update
    setTables(prev => [...prev, ...newTables])

    // persist new tables via tooling endpoint POST /api/tables (replace all)
    try {
      // send combined list: existing tables + newTables mapped to mongo shape
      const payload = [...tables, ...newTables].map(t => ({ participant_ids: t.participant_ids || [], x: t.x, y: t.y, shape: t.shape, rotation: t.rotation }))
      const res = await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const txt = await res.text().catch(() => 'upsert failed')
        throw new Error(txt)
      }
    } catch (err: any) {
      console.error('failed to persist new tables', err)
      setError(err?.message || String(err))
    }

    setGridMode(false)
    alert(`Created ${newTables.length} tables`)
  }

  const clearSelection = () => setSelectedIds([])

  const changeShapeForSelection = async (shape: string) => {
    if (selectedIds.length === 0) return
    const updates = tables.filter(t => selectedIds.includes(t.id)).map(t => ({ ...t, shape }))
    // optimistic
    setTables(prev => prev.map(t => selectedIds.includes(t.id) ? { ...t, shape } : t))
    try {
      const res = await fetch('/api/tables/upsert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tables: updates }) })
      if (!res.ok) {
        const txt = await res.text().catch(() => 'upsert failed')
        throw new Error(txt)
      }
    } catch (err: any) {
      console.error('bulk upsert failed', err)
      setError(err?.message || String(err))
    }
    clearSelection()
  }

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
        <h2>Room Map</h2>
        <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden', display: 'inline-block' }}>
          <div style={{ display: 'flex', gap: 8, padding: 8, alignItems: 'center' }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>Room W:</span>
              <input type="number" defaultValue={800} onBlur={e => setRoomWidth(Number(e.target.value) || 800)} style={{ width: 80, padding: 6 }} />
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 13 }}>Room H:</span>
              <input type="number" defaultValue={600} onBlur={e => setRoomHeight(Number(e.target.value) || 600)} style={{ width: 80, padding: 6 }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: 8, alignItems: 'center' }}>
            <select
              value={gridMode ? gridShape : 'idle'}
              onChange={e => {
                const v = e.target.value
                if (v === 'idle') {
                  setGridMode(false)
                } else if (v === 'cancel') {
                  setGridMode(false)
                } else if (v === 'squares' || v === 'circles') {
                  const shape = v === 'squares' ? 'square' : 'circle'
                  setGridShape(shape)
                  setGridMode(true)
                }
              }}
              style={{ padding: 6 }}
            >
              <option value="idle">add grid</option>
              <option value="squares">squares</option>
              <option value="circles">circles</option>
              {gridMode && <option value="cancel">Cancel</option>}
            </select>
            {gridMode && <div style={{ color: '#1976d2' }}>Select area on the map to place the grid</div>}
          </div>
          {selectedIds.length > 0 && (
            <div style={{ padding: 8, background: '#fff8e1', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div>{selectedIds.length} selected</div>
              <button onClick={() => changeShapeForSelection('square')}>Square</button>
              <button onClick={() => changeShapeForSelection('semicircle-left')}>Semicircle L</button>
              <button onClick={() => changeShapeForSelection('semicircle-right')}>Semicircle R</button>
              <button onClick={clearSelection}>Clear</button>
            </div>
          )}
          <div style={{ width: roomWidth || 360, height: roomHeight || 640 }}>
            {error && (
              <div style={{ padding: 8, background: '#ffebee', color: '#b71c1c', borderRadius: 6, marginBottom: 8 }}>
                {error}
              </div>
            )}
            <RoomMap tables={tables.slice(0, 300) as any} width={roomWidth || 360} height={roomHeight || 640} onTableClick={handleTableClick} onSelectionComplete={handleSelectionComplete} roomWidth={roomWidth} roomHeight={roomHeight} />
          </div>
        </div>
      </section>
    </main>
  )
}
