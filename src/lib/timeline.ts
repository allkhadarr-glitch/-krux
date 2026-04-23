import { SupabaseClient } from '@supabase/supabase-js'

export type TimelineConfidence = 'SYSTEM' | 'USER' | 'INFERRED'

export interface TimelineEvent {
  id:           string
  shipment_id:  string
  action_id?:   string
  event_type:   string
  actor_type:   'USER' | 'SYSTEM' | 'AGENT'
  actor_label?: string
  title:        string
  detail?:      string
  confidence:   TimelineConfidence
  metadata:     Record<string, unknown>
  created_at:   string
}

export async function insertTimelineEvent(
  supabase: SupabaseClient,
  event: Omit<TimelineEvent, 'id' | 'created_at'> & { organization_id: string }
): Promise<void> {
  const { error } = await supabase.from('execution_timeline').insert(event)
  if (error) console.error('[timeline] insert failed:', error.message)
  // Non-fatal — timeline is observability, not control flow
}
