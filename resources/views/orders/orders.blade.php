<x-layouts.loja-layout pageTitle="Meus pedidos — zLuz">
    <div id="orders-app"></div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/my-orders.jsx'])
    @endpush
</x-layouts.loja-layout>
