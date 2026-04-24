import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('shipment_documents')
    .select('*')
    .eq('shipment_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate signed URLs for each document (1hr expiry)
  const docs = await Promise.all(
    (data ?? []).map(async (doc) => {
      const { data: url } = await supabase.storage
        .from('shipment-documents')
        .createSignedUrl(doc.storage_path, 3600)
      return { ...doc, signed_url: url?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ documents: docs })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { doc_id, storage_path } = await req.json()

  await supabase.storage.from('shipment-documents').remove([storage_path])

  const { error } = await supabase
    .from('shipment_documents')
    .delete()
    .eq('id', doc_id)
    .eq('shipment_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
