import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, organization_id')
    .eq('id', id)
    .single()

  if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })

  const formData  = await req.formData()
  const file      = formData.get('file') as File | null
  const docType   = (formData.get('document_type') as string) ?? 'OTHER'

  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })

  const ext         = file.name.split('.').pop() ?? 'bin'
  const storagePath = `${id}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const bytes       = await file.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from('shipment-documents')
    .upload(storagePath, bytes, { contentType: file.type, upsert: false })

  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

  const { data: doc, error: dbErr } = await supabase
    .from('shipment_documents')
    .insert({
      shipment_id:     id,
      organization_id: shipment.organization_id,
      document_type:   docType,
      file_name:       file.name,
      file_size:       file.size,
      storage_path:    storagePath,
    })
    .select()
    .single()

  if (dbErr) {
    await supabase.storage.from('shipment-documents').remove([storagePath])
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, document: doc })
}
