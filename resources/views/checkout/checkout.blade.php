<x-layouts.loja-layout pageTitle="Checkout-Pix">
    <div id="checkout-app" style="width: 100%; min-height: 60vh;"></div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/checkout.jsx'])
    @endpush
</x-layouts.loja-layout>
