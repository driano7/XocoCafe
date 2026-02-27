import { NextResponse } from 'next/server';

// NOTA: Necesitarás configurar tu nodo Lightning o usar un servicio como LNBits
// Placeholder - reemplazar con tu implementación real
export async function POST(request: Request) {
  try {
    const { amountUSD } = await request.json();

    // Convertir USD a sats (ejemplo: 1 BTC = $45,000)
    const btcPrice = 45000; // TODO: Obtener de API real (CoinGecko, etc.)
    const amountBTC = amountUSD / btcPrice;
    const amountSats = Math.round(amountBTC * 100000000);

    // TODO: Integrar con tu nodo Lightning (LNBits, LNDHub, etc.)
    // Ejemplo con LNBits:
    // const lnbitsResponse = await fetch('https://legend.lnbits.com/api/v1/payments', {
    //   method: 'POST',
    //   headers: {
    //     'X-Api-Key': process.env.LNBITS_ADMIN_KEY,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     out: false,
    //     amount: amountSats,
    //     memo: `Xoco Café - Order ${orderId}`,
    //   })
    // })

    // Por ahora, mock response
    const mockInvoice = 'lnbc' + amountSats + 'n1...';
    const mockPaymentHash = '0x' + Math.random().toString(16).substring(2);

    // Guardar en DB (Supabase/Firebase)
    // await saveInvoiceToDatabase({
    //   orderId,
    //   paymentHash: mockPaymentHash,
    //   invoice: mockInvoice,
    //   amountSats,
    //   status: 'pending'
    // })

    return NextResponse.json({
      invoice: mockInvoice,
      amountSats,
      paymentHash: mockPaymentHash,
      expiresAt: new Date(Date.now() + 600000).toISOString(), // 10 min
    });
  } catch (error) {
    console.error('Invoice creation error:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
