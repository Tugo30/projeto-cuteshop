<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Pagamento confirmado</title>
</head>
<body style="font-family: sans-serif; color: #111; line-height: 1.5;">
    <p>Olá, {{ $order->customer_name }}.</p>
    <p>Recebemos o pagamento do pedido <strong>{{ $order->code }}</strong>.</p>
    <p>Total: <strong>R$ {{ number_format($order->total_cents / 100, 2, ',', '.') }}</strong></p>
    <p>Em breve o pedido segue para envio.</p>
    <p>zLuz</p>
</body>
</html>
