import React from 'react'
export type ParticipantStatus = {
    id: string
    state: string
    position: number
  }

type Props = {
  _id?: string
  participant_states: ParticipantStatus[]
  x: number
  y: number
  size?: number
  shape?: 'square' | 'semicircle-left' | 'semicircle-right' | 'circle'
  rotation?: number
  status?: string
  onClick?: (id?: string) => void
  editable?: boolean
  onSeatClick?: (participant: string) => void
}

export default function TablePrimitive({ _id, participant_states, x, y, size = 40, shape = 'square', rotation = 0, status, editable = true, onSeatClick }: Props) {
  const fill = status === 'in-bathroom' ? '#f44336' : status === 'raised-hand' ? '#ff9800' : status === 'queued' ? '#2196f3' : '#8bc34a'

  const commonProps: any = {
    transform: `translate(${x}, ${y}) rotate(${rotation})`,
    style: { cursor: editable ? 'default' : 'pointer' },
  }

  function Seat({x, y, state}: {x: number, y: number, state?: ParticipantStatus | null}) {
    const sid = state?.id ?? '?'
    const sstate = state?.state ?? ''
    const pos = state?.position ?? ''

    return <>
      { sstate.startsWith('bathroom') && <text x={x} y={y-20} fontSize={14} textAnchor="middle" fill="#ffffff">🚻</text> }
      { sstate.startsWith('queue') && <>
        <circle cx={x} cy={y-26} r={12} fill="#f44336" />
        <text x={x} y={y-22} fontSize={14} textAnchor="middle" fill="#ffffff">{pos}</text>
      </> }
      <text x={x} y={y+2} fontSize={20} textAnchor="middle" fill="#000000" onClick={(e) => { e.stopPropagation(); if (!editable && onSeatClick) onSeatClick(sid); }}>{sid}</text>
    </>
  }

  // circle: larger, two seats (left/right)
  if (shape === 'circle') {
    const r = size * 0.7
    // debug log to inspect participant ids
    // eslint-disable-next-line no-console
    return (
      <g {...commonProps}>
        <circle cx={0} cy={0} r={r} fill={fill} stroke="#333" />
        <line x1={0} y1={-r} x2={0} y2={r} stroke="#333" strokeWidth={1} />
        <Seat x={-r * 0.55} y={4} state={participant_states[0]} />
        <Seat x={r * 0.55} y={4} state={participant_states[1]} />
      </g>
    )
  } else {
    if (shape !== 'square') console.log('Unsupported shape:', shape) // debug log for unsupported shapes
    
    const state = participant_states[0] || {id:'?', state:'', position:'0'}

    return (
      <g {...commonProps}>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={6} fill={fill} stroke="#333" />
        <Seat x={0} y={4} state={state} />
      </g>
    )
  }
}
