import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { paymentHash } = await request.json();

    // TODO: Verificar con tu nodo Lightning
    // const lnbitsResponse = await fetch(`https://legend.lnbits.com/api/v1/payments/${paymentHash}`, {
    //   headers: { 'X-Api-Key': process.env.LNBITS_INVOICE_KEY }
    // })
    // const data = await lnbitsResponse.json()

    // Mock - por ahora simula que se pagó después de 10 segundos
    const mockSettled = Math.random() > 0.8; // 20% chance de estar pagado

    if (mockSettled) {
      // Actualizar orden en DB
      // await updateOrderStatus(orderId, 'paid', paymentHash)

      return NextResponse.json({
        settled: true,
        preimage: paymentHash,
      });
    }

    return NextResponse.json({ settled: false });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 });
  }
}
