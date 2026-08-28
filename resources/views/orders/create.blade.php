<x-layouts.main-layout pageTitle="Novo Pedido">
    <div class="container py-4">
        <div id="order-create-app"></div>
    </div>
    <script>
        window.orderClients        = @json($clients);
        window.orderPaymentMethods = @json($paymentMethods);
        window.orderServices       = @json($services);
    </script>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/order-create.jsx'])
    @endpush
</x-layouts.main-layout>