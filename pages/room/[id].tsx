import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import RoomMap from '../../components/RoomMap'

type Table = { _id?: string, participant_ids?: number[], x: number, y: number, shape?: 'square' | 'circle', rotation?: number }

export default function RoomPage() {
  const router = useRouter()
  const { id } = router.query
  const roomId = Array.isArray(id) ? id[0] : id

  const [tables, setTables] = useState<Table[]>([])
  const [error, setError] = useState<string | null>(null)
  const [roomTitle, setRoomTitle] = useState<string>('')
  const [roomWidth, setRoomWidth] = useState<number | undefined>(800)
  const [roomHeight, setRoomHeight] = useState<number | undefined>(600)
  const [editMode, setEditMode] = useState<boolean>(false)
  const [gridAction, setGridAction] = useState<'add' | 'square' | 'circle'>('add')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)

  useEffect(() => {
    if (!roomId) return
    // subscribe to server-sent events for live table updates
    let es: EventSource | null = null
    try {
      es = new EventSource(`/api/rooms/${encodeURIComponent(String(roomId))}/tables/subscribe`)
      es.addEventListener('message', (ev) => {
        try { const msg = JSON.parse(ev.data); if (msg && (msg.type === 'tables:replace' || msg.type === 'tables:update')) { reloadTables() } } catch (e) { reloadTables() }
      })
    } catch (e) {
      console.error('SSE subscribe failed', e)
    }
    let mounted = true
    ;(async () => {
      try {
        const r = await fetch(`/api/rooms`)
        if (r.ok) {
          const jd = await r.json()
          const room = (jd.rooms || []).find((x:any) => String(x._id) === String(roomId))
          if (room && mounted) { setRoomTitle(room.title); setRoomWidth(room.width); setRoomHeight(room.height) }
        }
      } catch {}
    })()

    ;(async () => {
      try {
        const res = await fetch(`/api/rooms/${encodeURIComponent(String(roomId))}/tables`)
        if (!res.ok) throw new Error('failed')
        const jd = await res.json()
        if (!mounted) return
        const mapped: Table[] = (jd.tables || []).map((t:any) => ({ _id: t._id ? String(t._id) : undefined, participant_ids: Array.isArray(t.participant_ids) ? t.participant_ids.map(Number) : [], x: Number(t.x)||0, y: Number(t.y)||0, shape: t.shape==='circle'?'circle':'square', rotation: t.rotation }))
        setTables(mapped)
      } catch (err:any) { setError(err?.message || String(err)) }
    })()
    return () => { mounted = false }
  }, [roomId])

  useEffect(() => {
    return () => {
      // close EventSource when leaving
      // Note: EventSource created in other effect will be closed by browser automatically on unmount
    }
  }, [])

  const handleTableClick = (id?: string) => { console.log('Table clicked', id) }

  const selectTablesInRect = (rect: { x1: number; y1: number; x2: number; y2: number }) => {
    const x = Math.min(rect.x1, rect.x2)
    const y = Math.min(rect.y1, rect.y2)
    const w = Math.abs(rect.x2 - rect.x1)
    const h = Math.abs(rect.y2 - rect.y1)
    const ids = tables.filter(t => t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h).map(t => t._id || '')
    setSelectedIds(ids.filter(Boolean))
  }

  const handleSelectionComplete = async (rect: { x1: number; y1: number; x2: number; y2: number }) => {
    setSelectionRect(rect)
    selectTablesInRect(rect)
  }

  const reloadTables = async () => {
    if (!roomId) return
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(String(roomId))}/tables`)
      if (!res.ok) throw new Error('failed to reload tables')
      const jd = await res.json()
      const mapped: Table[] = (jd.tables || []).map((t:any) => ({ _id: t._id ? String(t._id) : undefined, participant_ids: Array.isArray(t.participant_ids)?t.participant_ids.map(Number):[], x: Number(t.x)||0, y: Number(t.y)||0, shape: t.shape==='circle'?'circle':'square', rotation: t.rotation }))
      setTables(mapped)
    } catch (err:any) { console.error('reloadTables failed', err); setError(err?.message || String(err)) }
  }

  // --- Editing actions (optimistic updates) ---
  const postReplaceTables = async (newTables: any[]) => {
    // optimistically update UI
    setTables(newTables.map(t => ({ ...t })))
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(String(roomId))}/tables`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newTables) })
      if (!res.ok) {
        console.error('replace failed')
        await reloadTables()
      }
    } catch (err) { console.error('replace error', err); await reloadTables() }
  }

  const createGridFromRect = async (rect: { x1:number,y1:number,x2:number,y2:number }, shape: 'square'|'circle' = 'square', rows?: number, cols?: number) => {
    if (!rect) return
    const x = Math.min(rect.x1, rect.x2)
    const y = Math.min(rect.y1, rect.y2)
    const w = Math.abs(rect.x2 - rect.x1)
    const h = Math.abs(rect.y2 - rect.y1)
    let rCount = rows && rows > 0 ? Math.floor(rows) : 0
    let cCount = cols && cols > 0 ? Math.floor(cols) : 0
    if (rCount <= 0 || cCount <= 0) {
      // fallback: derive reasonable defaults
      const cell = 80
      cCount = Math.max(1, Math.floor(w / cell))
      rCount = Math.max(1, Math.floor(h / cell))
    }
    const dx = w / cCount
    const dy = h / rCount
    const newTables: Table[] = []
    let tmpIdx = 0
    for (let r = 0; r < rCount; r++) {
      for (let c = 0; c < cCount; c++) {
        const tx = Math.round(x + c * dx + dx/2)
        const ty = Math.round(y + r * dy + dy/2)
        const t: any = { x: tx, y: ty, shape, rotation: 0, participant_ids: [] }
        t._id = `tmp-${Date.now()}-${tmpIdx++}`
        newTables.push(t)
      }
    }
    // optimistic: append to existing tables and push to server by replacing room tables
    const merged = [...tables.map(t=> ({ ...t })), ...newTables]
    await postReplaceTables(merged)
    setSelectionRect(null)
    setSelectedIds([])
  }

  const promptAndCreateGrid = async (shape: 'square'|'circle') => {
    if (!selectionRect) return
    const rowsStr = window.prompt('Number of rows to create?', '2')
    if (rowsStr === null) { setGridAction('add'); return }
    const colsStr = window.prompt('Number of columns to create?', '3')
    if (colsStr === null) { setGridAction('add'); return }
    const r = parseInt(rowsStr || '', 10)
    const c = parseInt(colsStr || '', 10)
    if (!Number.isInteger(r) || r <= 0 || !Number.isInteger(c) || c <= 0) {
      window.alert('Invalid rows or columns')
      setGridAction('add')
      return
    }
    await createGridFromRect(selectionRect, shape, r, c)
  }

  const deleteSelectedTables = async () => {
    if (selectedIds.length === 0) return
    const remaining = tables.filter(t => !(t._id && selectedIds.includes(t._id)))
    await postReplaceTables(remaining)
    setSelectedIds([])
    setSelectionRect(null)
  }

  const renumberSelectedTables = async (startFrom = 1) => {
    if (selectedIds.length === 0) return
    // sort selected tables by x then y
    const sel = tables.filter(t => t._id && selectedIds.includes(t._id))
      .sort((a,b) => (a.x - b.x) || (a.y - b.y))
    let next = startFrom
    const updatedMap: Record<string, Table> = {}
    for (const t of sel) {
      if (t.shape === 'circle') {
        updatedMap[t._id || ''] = { ...t, participant_ids: [next, next+1] }
        next += 2
      } else {
        updatedMap[t._id || ''] = { ...t, participant_ids: [next] }
        next += 1
      }
    }
    const newTables = tables.map(t => t._id && updatedMap[t._id] ? updatedMap[t._id] : t)
    await postReplaceTables(newTables as any)
    setSelectedIds([])
  }

  const saveRoomSize = async (w?: number, h?: number) => {
    if (!roomId) return
    const body: any = {}
    if (typeof w === 'number') body.width = w
    if (typeof h === 'number') body.height = h
    // optimistic
    if (typeof w === 'number') setRoomWidth(w)
    if (typeof h === 'number') setRoomHeight(h)
      try {
      await fetch(`/api/rooms/${encodeURIComponent(String(roomId))}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } catch (err) { console.error('saveRoomSize error', err); }
  }

  // editing helpers (create grid, delete, renumber) omitted here for brevity — they mirror the index implementation

  return (
    <main style={{ padding: 16, fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Room: {roomTitle || roomId}</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13 }}>{editMode ? 'Edit mode' : 'View mode'}</div>
          <label style={{ position: 'relative', width: 48, height: 28, display: 'inline-block', cursor: 'pointer' }}>
            <input aria-label="edit-mode" type="checkbox" checked={editMode} onChange={e => setEditMode(e.target.checked)} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', margin: 0, cursor: 'pointer' }} />
            <div style={{ position: 'absolute', inset: 0, background: editMode ? '#e53935' : '#ccc', borderRadius: 999, transition: 'background 150ms', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: 3, left: editMode ? 26 : 3, width: 22, height: 22, background: '#fff', borderRadius: 999, boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 150ms', pointerEvents: 'none' }} />
          </label>
        </div>
      </div>

      {/* simplified view portion */}
      <div style={{ position: 'relative', width: roomWidth||360, height: roomHeight||640, border: '1px solid #eee' }}>
        {error && <div style={{ color: 'red' }}>{error}</div>}
        <RoomMap editable={editMode} tables={tables as any} width={roomWidth||360} height={roomHeight||640} onTableClick={handleTableClick} onSelectionComplete={handleSelectionComplete} selectionRect={selectionRect} roomWidth={roomWidth} roomHeight={roomHeight} roomId={roomId as string} />
        {editMode && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            {!selectionRect ? (
              <div style={{ padding: '8px 12px', background: '#fff8e1', border: '1px solid #ffe0b2', borderRadius: 4 }}>select rectangle</div>
            ) : (
              <>
            <select value={gridAction} onChange={e => {
              const v = e.target.value as any
              setGridAction(v)
              if ((v === 'square' || v === 'circle') && selectionRect) {
                promptAndCreateGrid(v === 'circle' ? 'circle' : 'square')
                // reset to default
                setGridAction('add')
              }
            }}>
              <option value="add">Add grid</option>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
            </select>
            <button onClick={deleteSelectedTables} disabled={selectedIds.length===0}>Delete selected</button>
            <button onClick={() => renumberSelectedTables(1)} disabled={selectedIds.length===0}>Renumber selected</button>
            <button onClick={() => { setSelectionRect(null); setSelectedIds([]) }}>Cancel selection</button>
                <div style={{ marginLeft: 'auto' }} />
              </>
            )}
          </div>
        )}
        {/* resize handle bottom-right */}
        {editMode && (
          <div
            onMouseDown={(e) => {
              e.preventDefault()
              const startX = e.clientX
              const startY = e.clientY
              const startW = roomWidth || 360
              const startH = roomHeight || 640
              function onMove(ev: MouseEvent) {
                const nx = Math.max(200, Math.round(startW + (ev.clientX - startX)))
                const ny = Math.max(200, Math.round(startH + (ev.clientY - startY)))
                setRoomWidth(nx)
                setRoomHeight(ny)
              }
              function onUp(ev: MouseEvent) {
                document.removeEventListener('mousemove', onMove)
                document.removeEventListener('mouseup', onUp)
                const nx = Math.max(200, Math.round(startW + (ev.clientX - startX)))
                const ny = Math.max(200, Math.round(startH + (ev.clientY - startY)))
                saveRoomSize(nx, ny)
              }
              document.addEventListener('mousemove', onMove)
              document.addEventListener('mouseup', onUp)
            }}
            style={{ position: 'absolute', right: 4, bottom: 4, width: 18, height: 18, background: '#fff', border: '1px solid #ccc', cursor: 'nwse-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3 }}>
            <div style={{ width: 10, height: 10, transform: 'rotate(45deg)', borderRight: '2px solid #888', borderBottom: '2px solid #888' }} />
          </div>
        )}
      </div>
      </div>
    </main>
  )
}
