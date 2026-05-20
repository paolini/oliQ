import React from 'react'

type Props = {
  participant: string
  onClose: () => void
  onSelect: (eventType: string) => void
  roomId: string
}

export default function EventPicker({ participant, onClose, onSelect, roomId }: Props) {
  const options = [
    { id: 'queue', label: "Entra in coda (bagno)" },
    { id: 'bathroom-1', label: 'Va al bagno 1' },
    { id: 'bathroom-2', label: 'Va al bagno 2' },
    { id: '', label: 'Torna al posto' },
  ]

  return (
    <div style={{ position: 'fixed', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 8, padding: 16, minWidth: 260 }}>
        <div style={{ marginBottom: 8, fontWeight: 600 }}>Evento per partecipante {participant}</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {options.map(o => (
            <button key={o.id} onClick={async () => {
              try {
                const path = `/api/rooms/${encodeURIComponent(roomId)}/events`
                const res = await fetch(path, { 
                  method: 'POST', 
                  headers: { 'Content-Type': 'application/json' }, 
                  body: JSON.stringify({ state: o.id, participant }) })
                if (!res.ok) throw new Error('failed')
                onSelect(o.id)
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error('Failed to post event', err)
                onSelect(o.id)
              }
            }} style={{ padding: '8px 10px' }}>
              {o.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 12, textAlign: 'right' }}>
          <button onClick={onClose} style={{ padding: '6px 10px' }}>Chiudi</button>
        </div>
      </div>
    </div>
  )
}
