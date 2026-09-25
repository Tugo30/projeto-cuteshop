<?php

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\Payment;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\User;
use App\Models\WebhookEvent;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use App\Mail\PaymentApproved;

function validCpf(): string
{
    return '52998224725';
}

function checkoutPayload(array $overrides = []): array
{
    return array_merge([
        'customer_name'     => 'Maria Silva',
        'customer_email'    => 'maria@example.com',
        'customer_phone'    => '11987654321',
        'customer_document' => validCpf(),
        'ship_zipcode'      => '01310100',
        'ship_street'       => 'Avenida Paulista',
        'ship_number'       => '1000',
        'ship_district'     => 'Bela Vista',
        'ship_city'         => 'Sao Paulo',
        'ship_state'        => 'SP',
        'payment_method'    => 'pix',
    ], $overrides);
}

function seedCart(User $user, ProductVariant $variant): Cart
{
    $cart = Cart::create([
        'user_id'           => $user->id,
        'shipping_cep'      => '01310100',
        'shipping_cents'    => 1500,
        'shipping_service'  => 'PAC',
    ]);

    CartItem::create([
        'cart_id'            => $cart->id,
        'product_variant_id' => $variant->id,
        'quantity'           => 1,
    ]);

    return $cart;
}

function fakeGetnet(?string $orderCode = null, string $status = 'WAITING', int $amount = 11500): void
{
    Http::fake(function ($request) use ($orderCode, $status, $amount) {
        $url = $request->url();

        if (str_contains($url, '/auth/oauth/v2/token')) {
            return Http::response(['access_token' => 'test-token', 'expires_in' => 3600], 200);
        }

        if ($request->method() === 'POST' && str_contains($url, '/v1/tokens/card')) {
            $body = $request->data();
            expect($body)->not->toHaveKey('security_code');

            return Http::response(['number_token' => 'tok_from_getnet'], 200);
        }

        if ($request->method() === 'POST' && str_contains($url, '/v1/payments/qrcode/pix')) {
            return Http::response([
                'payment_id'      => 'pix-pay-1',
                'status'          => 'WAITING',
                'additional_data' => ['qr_code' => '00020126580014BR.GOV.BCB.PIX'],
            ], 200);
        }

        if ($request->method() === 'POST' && str_contains($url, '/v1/payments/boleto')) {
            return Http::response([
                'payment_id' => 'bol-pay-1',
                'status'     => 'PENDING',
                'boleto'     => [
                    'barcode'      => '2379338128600000000300000000400184470000010000',
                    'typeful_line' => '23793.38128 60000.000003 00000.000400 1 84470000010000',
                    '_links'       => ['pdf' => ['href' => 'https://api-homologacao.getnet.com.br/v1/payments/boleto/bol-pay-1/pdf']],
                ],
            ], 200);
        }

        if ($request->method() === 'POST' && str_contains($url, '/v1/payments/credit')) {
            $json = $request->data();
            expect($json['credit']['card'] ?? [])->not->toHaveKey('card_number');
            expect($json['credit']['card']['number_token'] ?? null)->not->toBeEmpty();

            return Http::response([
                'payment_id' => 'card-pay-1',
                'status'     => 'APPROVED',
                'amount'     => $amount,
            ], 200);
        }

        if ($request->method() === 'GET' && str_contains($url, '/v1/payments/')) {
            return Http::response([
                'payment_id' => 'pix-pay-1',
                'status'     => $status,
                'amount'     => $amount,
                'order_id'   => $orderCode,
            ], 200);
        }

        return Http::response(['error' => 'unmocked', 'url' => $url], 500);
    });
}

beforeEach(function () {
    Mail::fake();
    $role = Role::factory()->create(['nome' => 'cliente']);
    $this->user = User::factory()->create(['role_id' => $role->id]);
    $this->variant = ProductVariant::factory()->create(['stock' => 5, 'price' => 100.00]);
});

test('checkout pix cria apenas cobranca pix na getnet', function () {
    fakeGetnet();
    $this->actingAs($this->user);
    seedCart($this->user, $this->variant);

    $response = $this->postJson('/api/checkout', checkoutPayload(['payment_method' => 'pix']));

    $response->assertCreated();
    $order = Order::where('code', $response->json('order_code'))->first();
    expect($order->payment_method)->toBe('pix');
    expect($order->payment->method)->toBe('pix');
    expect($order->payment->provider_id)->toBe('pix-pay-1');
    expect($order->payment->pix_payload)->toStartWith('000201');
    expect($this->variant->fresh()->stock)->toBe(5);

    Http::assertSent(fn ($r) => str_contains($r->url(), '/v1/payments/qrcode/pix'));
    Http::assertNotSent(fn ($r) => str_contains($r->url(), '/v1/payments/boleto'));
    Http::assertNotSent(fn ($r) => str_contains($r->url(), '/v1/payments/credit'));
});

test('checkout boleto cria apenas cobranca boleto na getnet', function () {
    fakeGetnet();
    $this->actingAs($this->user);
    seedCart($this->user, $this->variant);

    $response = $this->postJson('/api/checkout', checkoutPayload(['payment_method' => 'boleto']));

    $response->assertCreated();
    $order = Order::where('code', $response->json('order_code'))->first();
    expect($order->payment->method)->toBe('boleto');
    expect($order->payment->barcode())->not->toBeEmpty();
    Http::assertSent(fn ($r) => str_contains($r->url(), '/v1/payments/boleto'));
    Http::assertNotSent(fn ($r) => str_contains($r->url(), '/v1/payments/qrcode/pix'));
});

test('checkout cartao nao cobra na criacao do pedido', function () {
    fakeGetnet();
    $this->actingAs($this->user);
    seedCart($this->user, $this->variant);

    $response = $this->postJson('/api/checkout', checkoutPayload(['payment_method' => 'credit_card']));

    $response->assertCreated();
    $order = Order::where('code', $response->json('order_code'))->first();
    expect($order->payment->method)->toBe('credit_card');
    expect($order->payment->provider_id)->toBeNull();
    Http::assertNotSent(fn ($r) => str_contains($r->url(), '/v1/payments/credit'));
});

test('payCard recusa pan e cvv crus', function () {
    fakeGetnet();
    $this->actingAs($this->user);
    seedCart($this->user, $this->variant);
    $created = $this->postJson('/api/checkout', checkoutPayload(['payment_method' => 'credit_card']));
    $code = $created->json('order_code');

    $this->postJson("/api/checkout/{$code}/cartao", [
        'number_token'     => 'tok',
        'cardholder_name'  => 'MARIA SILVA',
        'expiration_month' => '12',
        'expiration_year'  => '30',
        'security_code'    => '123',
        'card_number'      => '5155901222280001',
        'cvv'              => '123',
    ])->assertStatus(422);
});

test('webhook sem token e rejeitado', function () {
    $this->postJson('/webhooks/getnet', ['payment_id' => 'pix-pay-1'])
        ->assertUnauthorized();
});

test('webhook confirma pagamento apos consulta na getnet e baixa estoque uma vez', function () {
    fakeGetnet();
    $this->actingAs($this->user);
    seedCart($this->user, $this->variant);
    $created = $this->postJson('/api/checkout', checkoutPayload(['payment_method' => 'pix']));
    $code = $created->json('order_code');
    $order = Order::where('code', $code)->first();

    fakeGetnet($code, 'APPROVED', (int) $order->total_cents);

    $payload = ['payment_id' => 'pix-pay-1', 'status' => 'APPROVED'];

    $this->postJson('/webhooks/getnet?token=test-webhook-secret', $payload)->assertOk();
    $this->postJson('/webhooks/getnet', $payload, ['X-Callback-Token' => 'test-webhook-secret'])->assertOk();

    $order->refresh();
    expect($order->status)->toBe('paid');
    expect($order->payment->status)->toBe('paid');
    expect($this->variant->fresh()->stock)->toBe(4);
    expect(StockMovement::where('type', 'venda')->count())->toBe(1);
    expect(WebhookEvent::count())->toBe(2);
    Mail::assertQueued(PaymentApproved::class);
});

test('frontend status nao marca pedido como pago sozinho', function () {
    fakeGetnet();
    $this->actingAs($this->user);
    seedCart($this->user, $this->variant);
    $created = $this->postJson('/api/checkout', checkoutPayload(['payment_method' => 'pix']));
    $code = $created->json('order_code');

    fakeGetnet($code, 'WAITING', 11500);

    $this->getJson("/api/checkout/{$code}/status")
        ->assertOk()
        ->assertJson(['paid' => false, 'status' => 'pending']);

    expect(Order::where('code', $code)->value('status'))->toBe('pending');
    expect($this->variant->fresh()->stock)->toBe(5);
});
