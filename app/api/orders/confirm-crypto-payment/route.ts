import { NextResponse } from 'next/server';
// import { supabase } from '@/lib/supabase' // Tu cliente Supabase

export async function POST(request: Request) {
  try {
    const { orderId, txHash, network, amount } = await request.json();

    // TODO: Actualizar orden en Supabase/Firebase
    // await supabase
    //   .from('orders')
    //   .update({
    //     payment_method: 'crypto',
    //     payment_tx_hash: txHash,
    //     payment_network: network,
    //     payment_wallet_address: walletAddress,
    //     payment_confirmed: true,
    //     status: 'paid',
    //     updated_at: new Date().toISOString()
    //   })
    //   .eq('id', orderId)

    // Enviar notificación al POS
    await fetch(process.env.POS_WEBHOOK_URL + '/api/orders/crypto-payment-received', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        txHash,
        network,
        amount,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    return NextResponse.json({ error: 'Failed to confirm payment' }, { status: 500 });
  }
}
