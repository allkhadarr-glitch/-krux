import { createClient } from '@supabase/supabase-js'
import { ShipmentEventType, EventActorType } from './types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LogEventParams {
  shipmentId:      string
  organizationId:  string
  eventType:       ShipmentEventType
  fromValue?:      string
  toValue?:        string
  metadata?:       Record<string, unknown>
  actorType?:      EventActorType
  actorId?:        string
}

/**
 * Logs an event to the shipment_events intelligence archive.
 * Fire-and-forget — never awaited on the critical path.
 *
 * DB triggers handle state-change events automatically (STAGE_CHANGED,
 * RISK_FLAG_CHANGED, CLEARED, etc.). Use this function for app-layer
 * events that triggers can't see: ACTION_COMPLETED, WHATSAPP_COMMAND,
 * DOCUMENT_UPLOADED, BRIEF_GENERATED.
 */
export function logShipmentEvent(params: LogEventParams): void {
  const {
    shipmentId,
    organizationId,
    eventType,
    fromValue,
    toValue,
    metadata    = {},
    actorType   = 'SYSTEM',
    actorId,
  } = params

  // Intentionally not awaited — event logging never blocks a user request
  supabaseAdmin.from('shipment_events').insert({
    shipment_id:      shipmentId,
    organization_id:  organizationId,
    event_type:       eventType,
    from_value:       fromValue ?? null,
    to_value:         toValue   ?? null,
    metadata,
    actor_type:       actorType,
    actor_id:         actorId   ?? null,
  }).then(({ error }) => {
    if (error) console.error('[shipment-events] log failed:', error.message)
  })
}
