<x-layouts.main-layout pageTitle="Clientes">
    <div class="container py-4">
        <div id="clients-app"></div>
    </div>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/clients.jsx'])
    @endpush
</x-layouts.main-layout>