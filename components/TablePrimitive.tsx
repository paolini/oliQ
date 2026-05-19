import React from 'react'

type Props = {
  _id?: string
  participant_ids?: number[]
  x: number
  y: number
  size?: number
  shape?: 'square' | 'semicircle-left' | 'semicircle-right' | 'circle'
  rotation?: number
  status?: string
  onClick?: (id?: string) => void
  editable?: boolean
  onSeatClick?: (participantNumber: number) => void
}

export default function TablePrimitive({ _id, participant_ids, x, y, size = 40, shape = 'square', rotation = 0, status, onClick, editable = true, onSeatClick }: Props) {
  const fill = status === 'in-bathroom' ? '#f44336' : status === 'raised-hand' ? '#ff9800' : status === 'queued' ? '#2196f3' : '#8bc34a'

  const commonProps: any = {
    transform: `translate(${x}, ${y}) rotate(${rotation})`,
    style: { cursor: editable ? 'default' : 'pointer' },
  }

  const pidText = (idx = 0) => (Array.isArray(participant_ids) && typeof participant_ids[idx] === 'number' ? String(participant_ids[idx]) : '')

  if (shape === 'square') {
    return (
      <g {...commonProps} onClick={() => onClick && onClick(_id)}>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={6} fill={fill} stroke="#333" />
        <text x={0} y={4} fontSize={10} textAnchor="middle" fill="#fff" onClick={(e) => { e.stopPropagation(); if (!editable && onSeatClick) onSeatClick(Number(pidText(0))); }}>{pidText(0)}</text>
      </g>
    )
  }
  if (shape === 'semicircle-left' || shape === 'semicircle-right') {
    const d = shape === 'semicircle-left'
      ? `M ${size / 2} 0 A ${size / 2} ${size / 2} 0 1 0 ${size / 2} 0 L ${-size / 2} 0 Z`
      : `M ${-size / 2} 0 A ${size / 2} ${size / 2} 0 1 1 ${-size / 2} 0 L ${size / 2} 0 Z`

    return (
      <g {...commonProps}>
        <path d={d} fill={fill} stroke="#333" />
        <text x={0} y={4} fontSize={10} textAnchor="middle" fill="#fff">{pidText(0)}</text>
      </g>
    )
  }

  // circle: larger, two seats (left/right)
  if (shape === 'circle') {
    const r = size * 0.7
    const seatR = Math.max(4, size * 0.18)
    // debug log to inspect participant ids
    // eslint-disable-next-line no-console
    return (
      <g {...commonProps} onClick={() => onClick && onClick(_id)}>
        <circle cx={0} cy={0} r={r} fill={fill} stroke="#333" />
        <line x1={0} y1={-r} x2={0} y2={r} stroke="#333" strokeWidth={1} />
        <text x={-r * 0.55} y={4} fontSize={10} textAnchor="middle" fill="#fff" onClick={(e) => { e.stopPropagation(); if (!editable && onSeatClick) onSeatClick(Number(pidText(0))); }}>{pidText(0)}</text>
        <text x={r * 0.55} y={4} fontSize={10} textAnchor="middle" fill="#fff" onClick={(e) => { e.stopPropagation(); if (!editable && onSeatClick) onSeatClick(Number(pidText(1))); }}>{pidText(1)}</text>
      </g>
    )
  }

  // fallback
  return (
    <g {...commonProps}>
      <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={6} fill={fill} stroke="#333" />
      <text x={0} y={4} fontSize={10} textAnchor="middle" fill="#fff">{pidText(0)}</text>
    </g>
  )
}
