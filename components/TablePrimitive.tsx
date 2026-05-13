import React from 'react'

type Props = {
  id: number
  x: number
  y: number
  size?: number
  shape?: 'square' | 'semicircle-left' | 'semicircle-right' | 'circle'
  rotation?: number
  status?: string
  onClick?: (id: number) => void
}

export default function TablePrimitive({ id, x, y, size = 40, shape = 'square', rotation = 0, status, onClick }: Props) {
  const fill = status === 'in-bathroom' ? '#f44336' : status === 'raised-hand' ? '#ff9800' : status === 'queued' ? '#2196f3' : '#8bc34a'

  const commonProps = {
    transform: `translate(${x}, ${y}) rotate(${rotation})`,
    onClick: () => onClick && onClick(id),
    style: { cursor: 'pointer' },
  }

  if (shape === 'square') {
    return (
      <g {...commonProps}>
        <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={6} fill={fill} stroke="#333" />
        <text x={0} y={4} fontSize={10} textAnchor="middle" fill="#fff">{id}</text>
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
        <text x={0} y={4} fontSize={10} textAnchor="middle" fill="#fff">{id}</text>
      </g>
    )
  }

  // circle: larger, two seats (left/right)
  if (shape === 'circle') {
    const r = size * 0.7
    const seatR = Math.max(4, size * 0.18)
    return (
      <g {...commonProps}>
        <circle cx={0} cy={0} r={r} fill={fill} stroke="#333" />
        <text x={0} y={4} fontSize={12} textAnchor="middle" fill="#fff">{id}</text>
        {/* left seat */}
        <circle cx={-r * 0.55} cy={0} r={seatR} fill="#fff" stroke="#333" />
        <text x={-r * 0.55} y={4} fontSize={8} textAnchor="middle" fill="#333">L</text>
        {/* right seat */}
        <circle cx={r * 0.55} cy={0} r={seatR} fill="#fff" stroke="#333" />
        <text x={r * 0.55} y={4} fontSize={8} textAnchor="middle" fill="#333">R</text>
      </g>
    )
  }

  // fallback
  return (
    <g {...commonProps}>
      <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={6} fill={fill} stroke="#333" />
      <text x={0} y={4} fontSize={10} textAnchor="middle" fill="#fff">{id}</text>
    </g>
  )
}
