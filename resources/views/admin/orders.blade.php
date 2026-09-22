<x-layouts.main-layout pageTitle="Pedidos">
    <div class="container py-4">
        <div id="admin-orders-app">
            <p style="padding:24px;color:#888">Carregando pedidos…</p>
        </div>
    </div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/admin-orders.jsx'])
    @endpush
</x-layouts.main-layout>