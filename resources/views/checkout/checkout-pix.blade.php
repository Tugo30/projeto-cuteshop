<x-layouts.main-layout pageTitle="Pagamento Pix">
    <div style="padding: 20px; width: 100%; min-height: 100vh;">
        <div id="checkout-pix-app" data-order-code="{{ $orderCode }}"></div>
    </div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/checkout-pix.jsx'])
    @endpush
</x-layouts.main-layout>