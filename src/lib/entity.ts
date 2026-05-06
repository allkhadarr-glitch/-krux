import { createClient } from '@supabase/supabase-js'
import { KruxEntity, KruxEntityType } from './types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Returns the KRUX entity for an organization.
 * Every org gets one on signup via DB trigger.
 */
export async function getEntityByOrg(organizationId: string): Promise<KruxEntity | null> {
  const { data } = await supabaseAdmin
    .from('krux_entities')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle()
  return data ?? null
}

/**
 * Looks up any entity by its public KRUX ID (e.g. KRUX-IMP-KE-00001).
 * Used by banks, insurers, and partner integrations.
 */
export async function getEntityByKruxId(kruxId: string): Promise<KruxEntity | null> {
  const { data } = await supabaseAdmin
    .from('krux_entities')
    .select('*')
    .eq('krux_id', kruxId)
    .maybeSingle()
  return data ?? null
}

/**
 * Creates a standalone KRUX entity that is not yet linked to a KRUX
 * organization — e.g. a manufacturer or clearing agent identified from
 * shipment data before they sign up.
 */
export async function createEntity(params: {
  entityType:          KruxEntityType
  countryCode?:        string
  name:                string
  tradingName?:        string
  kraPIN?:             string
  registrationNumber?: string
  email?:              string
  phone?:              string
  clearingAgentId?:    string
  manufacturerId?:     string
}): Promise<KruxEntity | null> {
  const country = (params.countryCode ?? 'KE').toUpperCase()

  // generate_krux_id is a Postgres function — call it via rpc
  const { data: idData } = await supabaseAdmin
    .rpc('generate_krux_id', { p_type: params.entityType, p_country: country })

  if (!idData) return null

  const { data, error } = await supabaseAdmin
    .from('krux_entities')
    .insert({
      krux_id:             idData,
      entity_type:         params.entityType,
      country_code:        country,
      name:                params.name,
      trading_name:        params.tradingName        ?? null,
      kra_pin:             params.kraPIN             ?? null,
      registration_number: params.registrationNumber ?? null,
      email:               params.email              ?? null,
      phone:               params.phone              ?? null,
      clearing_agent_id:   params.clearingAgentId    ?? null,
      manufacturer_id:     params.manufacturerId     ?? null,
    })
    .select()
    .single()

  if (error) {
    console.error('[entity] createEntity failed:', error.message)
    return null
  }
  return data
}

/**
 * Returns a compliance label for display.
 * NULL until the entity has >= 5 shipments.
 */
export function complianceLabel(entity: KruxEntity): string {
  if (!entity.compliance_tier) {
    const needed = Math.max(0, 5 - entity.total_shipments)
    return needed > 0 ? `${needed} more shipment${needed === 1 ? '' : 's'} to unlock` : 'Calculating…'
  }
  const icons: Record<string, string> = {
    PLATINUM: '🏆 Platinum',
    GOLD:     '🥇 Gold',
    SILVER:   '🥈 Silver',
    BRONZE:   '🥉 Bronze',
  }
  return icons[entity.compliance_tier] ?? entity.compliance_tier
}
