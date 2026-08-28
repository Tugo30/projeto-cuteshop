<x-layouts.main-layout pageTitle="Grupos de Clientes">
    <div class="container py-4">
        <div id="client-groups-app"></div>
    </div>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/clientGroups.jsx'])
    @endpush
</x-layouts.main-layout>
