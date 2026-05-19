import React, { useMemo, useState, useRef } from 'react'
import TablePrimitive from './TablePrimitive'

type Table = {
  _id?: string
  participant_ids?: number[]
  x: number
  y: number
  shape?: 'square' | 'semicircle-left' | 'semicircle-right' | 'circle'
  rotation?: number
  status?: string
}

type Props = {
  tables: Table[]
  width?: number
  height?: number
  onTableClick?: (id: number) => void
  enableGridInsert?: boolean
  onCreateTables?: (tables: Table[]) => void
  onSelectionComplete?: (rect: { x1: number, y1: number, x2: number, y2: number }) => void
  selectionRect?: { x1: number, y1: number, x2: number, y2: number } | null
  roomWidth?: number
  roomHeight?: number
  editable?: boolean
}

export default function RoomMap({ tables, width = 360, height = 640, onTableClick, onSelectionComplete, selectionRect: externalRect, roomWidth, roomHeight, editable = true }: Props) {
  const padding = 20
  const [selecting, setSelecting] = useState(false)
  const [rect, setRect] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const bounds = useMemo(() => {
    if (!tables || tables.length === 0) return { minX: 0, maxX: 1000, minY: 0, maxY: 1000 }
    const xs = tables.map(t => t.x)
    const ys = tables.map(t => t.y)
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  }, [tables])

  const viewBox = (typeof roomWidth === 'number' && typeof roomHeight === 'number')
    ? `0 0 ${roomWidth} ${roomHeight}`
    : `${bounds.minX - padding} ${bounds.minY - padding} ${bounds.maxX - bounds.minX + padding * 2} ${bounds.maxY - bounds.minY + padding * 2}`

  const handleClick = (id?: string) => {
    if (onTableClick && id) onTableClick(id)
  }

  const clientToSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const inv = ctm.inverse()
    const loc = pt.matrixTransform(inv)
    return { x: loc.x, y: loc.y }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editable) return
    if (!svgRef.current) return
    (e.target as Element).setPointerCapture(e.pointerId)
    const start = clientToSvg(e.clientX, e.clientY)
    setSelecting(true)
    setRect({ x1: start.x, y1: start.y, x2: start.x, y2: start.y })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!editable) return
    if (!selecting || !rect) return
    const p = clientToSvg(e.clientX, e.clientY)
    setRect({ ...rect, x2: p.x, y2: p.y })
  }

    const onPointerUp = (e: React.PointerEvent) => {
      if (!editable) return
      if (!selecting || !rect) return
      setSelecting(false)
      setRect(rect)
      if (onSelectionComplete) onSelectionComplete({ x1: rect.x1, y1: rect.y1, x2: rect.x2, y2: rect.y2 })
  }

    // sync external selectionRect prop if provided (clear or set)
    React.useEffect(() => {
      if (typeof externalRect === 'undefined') return
      setRect(externalRect || null)
      // when externalRect becomes non-null we set selecting=false so that pointer interactions restart
      if (!externalRect) setSelecting(false)
    }, [externalRect])

  const renderSelectionRect = () => {
    if (!rect) return null
    const x = Math.min(rect.x1, rect.x2)
    const y = Math.min(rect.y1, rect.y2)
    const w = Math.abs(rect.x2 - rect.x1)
    const h = Math.abs(rect.y2 - rect.y1)
    return <rect x={x} y={y} width={w} height={h} fill="rgba(33,150,243,0.15)" stroke="#2196f3" strokeDasharray="4 3" />
  }

  return (
    <div style={{ width, height, touchAction: 'none' }}>
      <svg ref={svgRef} width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="none" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
        <rect x={0} y={0} width={roomWidth || (bounds.maxX - bounds.minX + padding * 2)} height={roomHeight || (bounds.maxY - bounds.minY + padding * 2)} fill="#fafafa" />
        {tables.map(t => (
          <TablePrimitive key={t._id || `${t.x}-${t.y}`} _id={t._id} participant_ids={t.participant_ids} x={t.x} y={t.y} shape={t.shape || 'square'} rotation={t.rotation || 0} status={t.status} onClick={handleClick} />
        ))}
        {renderSelectionRect()}
      </svg>
    </div>
  )
}
