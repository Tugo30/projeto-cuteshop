<x-layouts.main-layout pageTitle="Pedidos por Cliente">
    <div class="container py-4">
        <div id="orders-by-client-app"></div>
    </div>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/orders-by-client.jsx'])
    @endpush
</x-layouts.main-layout>