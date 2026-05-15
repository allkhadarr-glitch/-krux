'use client'
import { useId } from 'react'

type Stage = 'PRE_SHIPMENT' | 'IN_TRANSIT' | 'AT_PORT' | 'CUSTOMS' | 'CLEARED'
type FreightMode = 'SEA_MOMBASA' | 'SEA_LAMU' | 'AIR_JKIA' | 'AIR_MBA' | 'AIR_EDL'

const STAGE_T: Record<Stage, number> = {
  PRE_SHIPMENT: 0.05,
  IN_TRANSIT:   0.44,
  AT_PORT:      0.78,
  CUSTOMS:      0.91,
  CLEARED:      0.97,
}

const SEA_STAGE_LABEL: Record<Stage, string> = {
  PRE_SHIPMENT: 'PRE-SHIP',
  IN_TRANSIT:   'IN TRANSIT',
  AT_PORT:      'AT PORT',
  CUSTOMS:      'CUSTOMS',
  CLEARED:      'CLEARED',
}

const AIR_STAGE_LABEL: Record<Stage, string> = {
  PRE_SHIPMENT: 'PRE-SHIP',
  IN_TRANSIT:   'AIRBORNE',
  AT_PORT:      'LANDED',
  CUSTOMS:      'CUSTOMS',
  CLEARED:      'CLEARED',
}

// Sea: deep arc — simulates ocean voyage
const SEA = {
  P0: { x: 24,  y: 58 },
  P1: { x: 100, y: 14 },
  P2: { x: 300, y: 14 },
  P3: { x: 376, y: 58 },
}

// Air: shallower arc — direct flight path
const AIR = {
  P0: { x: 24,  y: 54 },
  P1: { x: 140, y: 34 },
  P2: { x: 260, y: 34 },
  P3: { x: 376, y: 54 },
}

type Pts = typeof SEA

function cubic(t: number, p: Pts) {
  const mt = 1 - t
  return {
    x: mt*mt*mt*p.P0.x + 3*mt*mt*t*p.P1.x + 3*mt*t*t*p.P2.x + t*t*t*p.P3.x,
    y: mt*mt*mt*p.P0.y + 3*mt*mt*t*p.P1.y + 3*mt*t*t*p.P2.y + t*t*t*p.P3.y,
  }
}

function detectMode(dest?: string): FreightMode {
  const d = (dest ?? '').toLowerCase()
  if (d.includes('lamu'))                                                      return 'SEA_LAMU'
  if (d.includes('jkia') || d.includes('nbo') || d.includes('nairobi') || d.includes('wilson')) return 'AIR_JKIA'
  if (d.includes('mba') || d.includes('moi') || d.includes('mombasa airport') || d.includes('mombasa intl')) return 'AIR_MBA'
  if (d.includes('edl') || d.includes('eldoret'))                                                             return 'AIR_EDL'
  return 'SEA_MOMBASA'
}

const MODE_LABEL: Record<FreightMode, string> = {
  SEA_MOMBASA: 'Sea · Mombasa',
  SEA_LAMU:    'Sea · Lamu',
  AIR_JKIA:    'Air · JKIA',
  AIR_MBA:     'Air · Mombasa MBA',
  AIR_EDL:     'Air · Eldoret',
}

// Short dest labels kept ≤7 chars so they fit centered at P3.x without clipping
const DEST_LABEL: Record<FreightMode, string> = {
  SEA_MOMBASA: 'MOMBASA',
  SEA_LAMU:    'LAMU',
  AIR_JKIA:    'JKIA',
  AIR_MBA:     'MBA',
  AIR_EDL:     'EDL',
}

const ARRIVED_LABEL: Record<FreightMode, string> = {
  SEA_MOMBASA: 'ARRIVED',
  SEA_LAMU:    'ARRIVED',
  AIR_JKIA:    'LANDED',
  AIR_MBA:     'LANDED',
  AIR_EDL:     'LANDED',
}

function statusToStage(status: string): Stage {
  switch (status) {
    case 'IN_TRANSIT':        return 'IN_TRANSIT'
    case 'AT_PORT':
    case 'CUSTOMS_HOLD':      return 'AT_PORT'
    case 'CUSTOMS_CLEARANCE': return 'CUSTOMS'
    case 'DELIVERED':         return 'CLEARED'
    default:                  return 'PRE_SHIPMENT'
  }
}

interface VesselRouteProps {
  shipmentStatus:   string
  destinationPort?: string
  originLabel?:     string
  vesselName?:      string   // vessel name for sea; flight/AWB for air
  eta?:             string
}

// AIS enhancement layer: when live AIS data is available, resolve a geographic
// progress ratio (0.0–1.0) for the vessel and pass it as an override to cubic().
// The schematic bezier is the permanent base; AIS only refines the dot position.
export default function VesselRoute({
  shipmentStatus, destinationPort, originLabel, vesselName, eta,
}: VesselRouteProps) {
  const uid     = useId()
  const clipId  = `vr${uid.replace(/[^a-zA-Z0-9]/g, '')}`
  const stage   = statusToStage(shipmentStatus)
  const t       = STAGE_T[stage]
  const mode    = detectMode(destinationPort)
  const isAir   = mode === 'AIR_JKIA' || mode === 'AIR_MBA'
  const pts     = isAir ? AIR : SEA
  const pos     = cubic(t, pts)
  const cleared = stage === 'CLEARED'
  const color   = cleared ? '#00C896' : '#F59E0B'
  const labels  = isAir ? AIR_STAGE_LABEL : SEA_STAGE_LABEL
  const pathD   = `M ${pts.P0.x},${pts.P0.y} C ${pts.P1.x},${pts.P1.y} ${pts.P2.x},${pts.P2.y} ${pts.P3.x},${pts.P3.y}`
  const labelY  = Math.max(pos.y - 18, 8)
  const pulseDur = isAir ? '1.8s' : '2.4s'

  const etaText = eta ? (() => {
    try { return new Date(eta).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) }
    catch { return null }
  })() : null

  return (
    <div className="mx-3 sm:mx-4 mt-3">
      <div className="bg-[#060E1A] border border-[#1E3A5F] rounded-xl px-3 pt-2.5 pb-2 overflow-hidden">

        {/* Header: mode + stage */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#334155] uppercase tracking-widest font-mono">
            {MODE_LABEL[mode]}
          </span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full"
              style={{ background: color, boxShadow: cleared ? 'none' : `0 0 4px ${color}` }} />
            <span className="text-[10px] font-bold font-mono tracking-wide" style={{ color }}>
              {labels[stage]}
            </span>
          </div>
        </div>

        {/* Route arc */}
        <svg viewBox="0 0 400 80" width="100%" aria-hidden="true">
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={pos.x} height="80" />
            </clipPath>
          </defs>

          {/* Full route — grey dashed */}
          <path d={pathD} fill="none" stroke="#1E3A5F" strokeWidth="2"
            strokeDasharray={isAir ? '3 6' : '5 4'} />

          {/* Completed segment — colored, clipped at ship/plane x position */}
          <path d={pathD} fill="none" stroke={color} strokeWidth="2.5"
            strokeOpacity={0.8} clipPath={`url(#${clipId})`} />

          {/* Origin dot */}
          <circle cx={pts.P0.x} cy={pts.P0.y} r="3.5"
            fill="#060E1A" stroke="#334155" strokeWidth="2" />

          {/* Destination dot */}
          <circle cx={pts.P3.x} cy={pts.P3.y} r="3.5"
            fill={cleared ? color : '#060E1A'}
            stroke={cleared ? color : '#334155'}
            strokeWidth="2" />

          {/* Stage label above vehicle */}
          <text x={pos.x} y={labelY} textAnchor="middle"
            fontSize="8.5" fontWeight="700" fill={color}
            fontFamily="ui-monospace,SFMono-Regular,monospace" letterSpacing="0.8">
            {labels[stage]}
          </text>

          {/* Pulse ring */}
          {!cleared && (
            <circle cx={pos.x} cy={pos.y} r="8" fill="none"
              stroke={color} strokeWidth="1.5" strokeOpacity="0.25">
              <animate attributeName="r"              values="6;13;6"     dur={pulseDur} repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.3;0;0.3"  dur={pulseDur} repeatCount="indefinite" />
            </circle>
          )}

          {/* Vehicle icon */}
          {isAir ? (
            // Top-down plane silhouette pointing right
            <g transform={`translate(${pos.x},${pos.y})`}>
              <polygon
                points="7,0 -3,-2 -6,-5 -7,-4 -4,-1.5 -7,-1.5 -7,1.5 -4,1.5 -7,4 -6,5 -3,2"
                fill={color}
              />
            </g>
          ) : (
            // Ship dot
            <>
              <circle cx={pos.x} cy={pos.y} r="5.5" fill="#060E1A" stroke={color} strokeWidth="2.5" />
              <circle cx={pos.x} cy={pos.y} r="2"   fill={color} />
            </>
          )}

          {/* Origin label — left-anchored */}
          <text x={pts.P0.x - 10} y="75" textAnchor="start"
            fontSize="8" fill="#334155"
            fontFamily="ui-monospace,SFMono-Regular,monospace" letterSpacing="0.5">
            {(originLabel ?? 'ORIGIN').toUpperCase().slice(0, 10)}
          </text>

          {/* Destination label — right-anchored */}
          <text x={pts.P3.x + 10} y="75" textAnchor="end"
            fontSize="8" fill={cleared ? color : '#475569'}
            fontFamily="ui-monospace,SFMono-Regular,monospace" letterSpacing="0.5">
            {DEST_LABEL[mode]}
          </text>
        </svg>

        {/* Vessel / flight ref + ETA strip */}
        {(vesselName || etaText) && (
          <div className="flex items-center justify-between pt-1.5 mt-0.5 border-t border-[#1E3A5F]/40">
            {vesselName ? (
              <span className="text-[10px] text-[#475569] font-mono tracking-wide truncate max-w-[55%]">
                {vesselName}
              </span>
            ) : <span />}
            {etaText && !cleared && (
              <span className="text-[10px] text-[#475569] font-mono shrink-0 ml-2">
                ETA <span className="text-[#64748B]">{etaText}</span>
              </span>
            )}
            {cleared && (
              <span className="text-[10px] text-[#00C896] font-bold font-mono shrink-0 ml-2">
                {ARRIVED_LABEL[mode]}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
