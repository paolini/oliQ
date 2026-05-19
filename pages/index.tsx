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
  const [gridAction, setGridAction] = useState<'add' | 'squares' | 'circles'>('add')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
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
    const ids = tables.filter(t => t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h).map(t => t._id || '')
    setSelectedIds(ids.filter(Boolean))
  }

  const handleSelectionComplete = async (rect: { x1: number; y1: number; x2: number; y2: number }) => {
    // always store the last selection rectangle
    setSelectionRect(rect)
    // always select tables inside rect; grid creation is triggered by button
    selectTablesInRect(rect)
    return
  }

  const createGridFromRect = async (rect: { x1: number; y1: number; x2: number; y2: number }, shapeOverride?: 'square' | 'circle') => {
    if (!rect) return
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

    const newTables: Table[] = []
    let tmpCounter = Date.now()
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = x + (c + 0.5) * cellW
        const cy = y + (r + 0.5) * cellH
        const shapeToUse = shapeOverride || gridShape
        const tbl = { _id: `tmp-${tmpCounter++}`, participant_ids: [], x: Math.round(cx), y: Math.round(cy), shape: shapeToUse, rotation: undefined }
        newTables.push(tbl)
      }
    }

    // optimistic update
    setTables(prev => [...prev, ...newTables])

    // persist new tables via tooling endpoint POST /api/tables (replace all)
    try {
      const payload = [...tables, ...newTables].map(t => ({ participant_ids: t.participant_ids || [], x: t.x, y: t.y, shape: t.shape, rotation: t.rotation }))
      const res = await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const txt = await res.text().catch(() => 'upsert failed')
        throw new Error(txt)
      }
      await reloadTables()
    } catch (err: any) {
      console.error('failed to persist new tables', err)
      setError(err?.message || String(err))
    }

    setSelectionRect(null)
    alert(`Created ${newTables.length} tables`)
  }

  const clearSelection = () => setSelectedIds([])

  const clearSelectionAndRect = () => { setSelectedIds([]); setSelectionRect(null) }

  const reloadTables = async () => {
    try {
      const res = await fetch('/api/tables')
      if (!res.ok) throw new Error('failed to reload tables')
      const data = await res.json()
      const docs = data.tables || []
      const mapped: Table[] = docs.map((t: any) => ({
        _id: t._id ? String(t._id) : undefined,
        participant_ids: Array.isArray(t.participant_ids) ? t.participant_ids.map(Number) : [],
        x: Number(t.x) || 0,
        y: Number(t.y) || 0,
        shape: t.shape === 'circle' ? 'circle' : 'square',
        rotation: typeof t.rotation === 'number' ? t.rotation : undefined,
      }))
      setTables(mapped)
    } catch (err: any) {
      console.error('reloadTables failed', err)
      setError(err?.message || String(err))
    }
  }

  

  const deleteSelectedTables = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} selected table(s)?`)) return

    // optimistic update
    setTables(prev => prev.filter(t => !(t._id && selectedIds.includes(t._id))))
    try {
      // persist remaining tables via tooling endpoint POST /api/tables (replace all)
      const remaining = tables.filter(t => !(t._id && selectedIds.includes(t._id)))
      const payload = remaining.map(t => ({ participant_ids: t.participant_ids || [], x: t.x, y: t.y, shape: t.shape, rotation: t.rotation }))
      const res = await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const txt = await res.text().catch(() => 'delete failed')
        throw new Error(txt)
      }
      await reloadTables()
    } catch (err: any) {
      console.error('failed to persist delete', err)
      setError(err?.message || String(err))
    }
    clearSelection()
  }

  const renumberSelectedTables = async (start: number) => {
    if (selectedIds.length === 0) return

    // compute ordering: top-to-bottom (y asc), left-to-right (x asc)
    const selectedTables = tables.filter(t => t._id && selectedIds.includes(t._id)).slice()
    selectedTables.sort((a, b) => {
      if (a.y === b.y) return (a.x || 0) - (b.x || 0)
      return (a.y || 0) - (b.y || 0)
    })

    // assign numbers in sorted order, store in map by _id so we can apply to original tables array
    let next = start
    const assignMap: Record<string, number[]> = {}
    for (const t of selectedTables) {
      const isCircle = t.shape === 'circle'
      const ids = isCircle ? [next, next + 1] : [next]
      assignMap[String(t._id)] = ids
      next += ids.length
    }

    const newTables = tables.map(t => {
      if (!t._id) return t
      const ids = assignMap[String(t._id)]
      if (!ids) return t
      return { ...t, participant_ids: ids }
    })

    // optimistic update
    setTables(newTables)
    try {
      const payload = newTables.map(t => ({ participant_ids: t.participant_ids || [], x: t.x, y: t.y, shape: t.shape, rotation: t.rotation }))
      const res = await fetch('/api/tables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) {
        const txt = await res.text().catch(() => 'renumber failed')
        throw new Error(txt)
      }
      await reloadTables()
    } catch (err: any) {
      console.error('failed to persist renumber', err)
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
            <div style={{ color: '#999' }}>{!selectionRect && 'Select an area to enable grid'}</div>
          </div>
          {(selectedIds.length > 0 || selectionRect) && (
            <div style={{ padding: 8, background: '#fff8e1', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div>{selectedIds.length > 0 ? `${selectedIds.length} selected` : '0 selected'}</div>
              <button onClick={deleteSelectedTables} style={{ color: '#b71c1c' }} disabled={selectedIds.length === 0}>Delete</button>
              {selectionRect && (
                <select
                  value={gridAction}
                  onChange={async e => {
                    const v = e.target.value as 'add' | 'squares' | 'circles'
                    setGridAction(v)
                    if (!selectionRect) return
                    if (v === 'squares' || v === 'circles') {
                      const shape = v === 'squares' ? 'square' : 'circle'
                      await createGridFromRect(selectionRect, shape)
                      setGridAction('add')
                    }
                  }}
                  style={{ padding: 6 }}
                >
                  <option value="add">add grid</option>
                  <option value="squares">squares</option>
                  <option value="circles">circles</option>
                </select>
              )}
              {selectedIds.length > 0 && (
                <button onClick={async () => {
                  const startStr = prompt('Numero del primo posto (intero)?')
                  if (!startStr) return
                  const start = Number(startStr)
                  if (!Number.isInteger(start)) return alert('Inserire un numero intero valido')
                  await renumberSelectedTables(start)
                }}>Renumber</button>
              )}
              <button onClick={clearSelectionAndRect}>cancel</button>
            </div>
          )}
          <div style={{ width: roomWidth || 360, height: roomHeight || 640 }}>
            {error && (
              <div style={{ padding: 8, background: '#ffebee', color: '#b71c1c', borderRadius: 6, marginBottom: 8 }}>
                {error}
              </div>
            )}
            <RoomMap tables={tables.slice(0, 300) as any} width={roomWidth || 360} height={roomHeight || 640} onTableClick={handleTableClick} onSelectionComplete={handleSelectionComplete} selectionRect={selectionRect} roomWidth={roomWidth} roomHeight={roomHeight} />
          </div>
        </div>
      </section>
    </main>
  )
}
