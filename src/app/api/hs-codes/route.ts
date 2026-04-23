import { NextRequest, NextResponse } from 'next/server'

// EAC Common External Tariff — curated Kenya import codes with duty rates
const HS_CODES = [
  // Pharmaceuticals
  { code: '3004.90', description: 'Medicaments — mixed/unmixed products', duty: 0,  category: 'Pharmaceuticals', regulator: 'PPB' },
  { code: '3004.10', description: 'Antibiotics preparations', duty: 0, category: 'Pharmaceuticals', regulator: 'PPB' },
  { code: '3004.20', description: 'Vitamins and vitamin preparations', duty: 0, category: 'Pharmaceuticals', regulator: 'PPB' },
  { code: '3002.10', description: 'Antisera and other blood fractions', duty: 0, category: 'Pharmaceuticals', regulator: 'PPB' },
  { code: '3003.90', description: 'Medicaments (mixed), not retail', duty: 0, category: 'Pharmaceuticals', regulator: 'PPB' },
  { code: '3006.50', description: 'First-aid boxes and kits', duty: 25, category: 'Pharmaceuticals', regulator: 'PPB' },
  // Agrochemicals
  { code: '3808.91', description: 'Insecticides', duty: 25, category: 'Agrochemicals', regulator: 'PCPB' },
  { code: '3808.93', description: 'Herbicides, anti-sprouting products', duty: 25, category: 'Agrochemicals', regulator: 'PCPB' },
  { code: '3808.94', description: 'Disinfectants', duty: 25, category: 'Agrochemicals', regulator: 'PCPB' },
  { code: '3808.92', description: 'Fungicides', duty: 25, category: 'Agrochemicals', regulator: 'PCPB' },
  // Food & Beverages
  { code: '1901.10', description: 'Infant formula preparations', duty: 25, category: 'Food', regulator: 'KEBS' },
  { code: '2106.90', description: 'Food preparations NEC', duty: 25, category: 'Food', regulator: 'KEBS' },
  { code: '1905.90', description: 'Bread, pastry, cakes, biscuits', duty: 25, category: 'Food', regulator: 'KEBS' },
  { code: '0901.11', description: 'Coffee, not roasted, not decaffeinated', duty: 0, category: 'Food', regulator: 'KEBS' },
  { code: '1507.90', description: 'Soya-bean oil, refined', duty: 10, category: 'Food', regulator: 'KEBS' },
  // Electronics
  { code: '8471.30', description: 'Laptop computers', duty: 0, category: 'Electronics', regulator: 'KEBS' },
  { code: '8517.12', description: 'Mobile phones', duty: 10, category: 'Electronics', regulator: 'KEBS' },
  { code: '8528.72', description: 'Television receivers', duty: 25, category: 'Electronics', regulator: 'KEBS' },
  { code: '8501.10', description: 'Electric motors <37.5W', duty: 25, category: 'Electronics', regulator: 'KEBS' },
  { code: '8544.42', description: 'Electric conductors, voltage ≤1000V', duty: 25, category: 'Electronics', regulator: 'KEBS' },
  // Textiles
  { code: '6109.10', description: 'T-shirts, singlets — cotton', duty: 25, category: 'Textiles', regulator: 'KEBS' },
  { code: '6203.42', description: 'Men\'s trousers — cotton', duty: 25, category: 'Textiles', regulator: 'KEBS' },
  { code: '5208.21', description: 'Woven fabrics — cotton, bleached', duty: 25, category: 'Textiles', regulator: 'KEBS' },
  // Chemicals & Cosmetics
  { code: '3303.00', description: 'Perfumes and toilet waters', duty: 25, category: 'Cosmetics', regulator: 'KEBS' },
  { code: '3304.99', description: 'Beauty/make-up preparations NEC', duty: 25, category: 'Cosmetics', regulator: 'KEBS' },
  { code: '3305.10', description: 'Shampoos', duty: 25, category: 'Cosmetics', regulator: 'KEBS' },
  { code: '3401.11', description: 'Soap for toilet use', duty: 25, category: 'Cosmetics', regulator: 'KEBS' },
  // Vehicles & Parts
  { code: '8703.23', description: 'Motor cars — 1500-3000cc engines', duty: 25, category: 'Vehicles', regulator: 'KEBS' },
  { code: '8708.29', description: 'Vehicle parts and accessories NEC', duty: 25, category: 'Vehicles', regulator: 'KEBS' },
  { code: '4011.10', description: 'Pneumatic tyres — motor cars', duty: 25, category: 'Vehicles', regulator: 'KEBS' },
  // Machinery
  { code: '8479.89', description: 'Machines for special industries NEC', duty: 0, category: 'Machinery', regulator: 'KEBS' },
  { code: '8422.30', description: 'Machinery for filling/closing bottles', duty: 0, category: 'Machinery', regulator: 'KEBS' },
  { code: '8428.90', description: 'Lifting/loading machinery NEC', duty: 0, category: 'Machinery', regulator: 'KEBS' },
  // Medical Devices
  { code: '9018.90', description: 'Medical instruments NEC', duty: 0, category: 'Medical', regulator: 'PPB' },
  { code: '9019.10', description: 'Mechanotherapy appliances', duty: 0, category: 'Medical', regulator: 'PPB' },
  { code: '9020.00', description: 'Breathing appliances', duty: 0, category: 'Medical', regulator: 'PPB' },
  // Petroleum / Energy
  { code: '2710.19', description: 'Petroleum oils — not crude, light oils', duty: 0, category: 'Energy', regulator: 'EPRA' },
  { code: '2711.19', description: 'Petroleum gases — liquefied, other', duty: 0, category: 'Energy', regulator: 'EPRA' },
  { code: '8541.40', description: 'Solar cells, photovoltaic', duty: 0, category: 'Energy', regulator: 'EPRA' },
  // Plastics
  { code: '3926.90', description: 'Articles of plastics NEC', duty: 25, category: 'Plastics', regulator: 'KEBS' },
  { code: '3923.30', description: 'Carboys, bottles, flasks of plastics', duty: 25, category: 'Plastics', regulator: 'KEBS' },
  // Paper
  { code: '4802.55', description: 'Paper — printing/writing, reels', duty: 0, category: 'Paper', regulator: 'KEBS' },
  { code: '4819.10', description: 'Cartons, boxes of corrugated paper', duty: 25, category: 'Paper', regulator: 'KEBS' },
]

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase() ?? ''

  const results = q.length < 2
    ? HS_CODES.slice(0, 20)
    : HS_CODES.filter(
        (h) =>
          h.code.includes(q) ||
          h.description.toLowerCase().includes(q) ||
          h.category.toLowerCase().includes(q) ||
          h.regulator.toLowerCase().includes(q)
      ).slice(0, 15)

  return NextResponse.json(results)
}
