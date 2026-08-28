<x-layouts.main-layout pageTitle="Perfil do Cliente">
    <div class="container py-4">
        <div id="client-profile-app"></div>
    </div>
    <script>
        window.clientId             = {{ $clientId }};
        window.clientGroups         = @json(\App\Models\ClientGroup::all());
        window.orderPaymentMethods  = @json(\App\Models\PaymentMethod::all(['id','nome']));
        window.orderServices        = @json($services);
    </script>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/client-profile.jsx'])
    @endpush
</x-layouts.main-layout>