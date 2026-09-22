<x-layouts.loja-layout pageTitle="Pagamento">
    <div id="checkout-payment-app" data-order-code="{{ $orderCode }}" style="width: 100%; min-height: 60vh;"></div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/checkout-payment.jsx'])
    @endpush
</x-layouts.loja-layout>