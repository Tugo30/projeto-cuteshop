<x-layouts.main-layout pageTitle="Pedidos">
    <div class="container py-4">
        <div id="orders-app"></div>
    </div>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/orders.jsx'])
    @endpush
</x-layouts.main-layout>