<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family: Arial, sans-serif; color: #222; max-width: 560px; margin: 0 auto;">
    <h2>Recebemos seu pedido, {{ $order->customer_name }}!</h2>    
    <p>Pedido <strong>{{ $order->code }} - aguardando confirmação do pagamento via PIX.</strong> </p>

    <table style="width:100%; border-collapse: collapse; margin-top: 16px;">
        @foreach
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0">{{ $item->product_name }} ({{ $item->variant_size }}) x{{ $item->quantity }} </td>
                <td style="padding:8px 0; text-align: right;"> R${{ number_format($item->total / 100, 2, ',', '.') }} </td>
            </tr>
        @endforeach
    </table>

    <p style="margin-top: 16px; font-size: 16px">
        <strong>Total: R$: {{ number_format($irder->total_cents / 100, 2, ',', '.') }} </strong>
    </p>

    <p style="margin-top: 24px;"> 
        <a href="{{ route('checkout.pix', $order->code) }}" style="background: #111; color: #fff; padding: 12px 20px; text-decoration:none;"> 
            Ver Pix e finalizar pagamento
        </a>
    </p>

</body>
</html>