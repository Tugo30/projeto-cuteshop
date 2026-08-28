<x-layouts.main-layout pageTitle="Pedidos">
        <div class="container py-4">
            <div id="admin-orders-app"></div>
        </div>
        @push('script')
            @viteReactRefresh
            @vite(['resources/css/app.css', 'resources/js/admin-orders.jsx'])
        @endpush
</x-layouts.main-layout>