<x-layouts.main-layout pageTitle="Formas de Pagamento">
    <div class="container py-4">
        <div id="payment-app"></div>
    </div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/payment-methods.jsx'])
    @endpush
</x-layouts.main-layout>