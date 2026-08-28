<!DOCTYPE html>
<html lang="pt-BR">
<body style="font-family: Arial, sans-serif; color: #222; max-width: 560px; margin: 0 auto;">
    <h2>Pagamento aprovado!</h2>    
    <p>Oi {{ $order-customer_name }}, confirmamos o pagamento do pedido. </p>
    <p>Já estamos preparando seu envio. </p>

    <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        @foreach($order->items as $item)
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px 0">{{ $item->product_name }} ({{ $item->variant_size }}) x{{ $item->quantity }} </td>    
            </tr>
        @endforeach
    </table>

    <p style="margin-top: 16px; font-size: 16px">
        <strong> Total pago: R$ {{ $number_format($order->total_cents / 100, 2, ',', '.') }} </strong>
    </p>

</body>
</html>