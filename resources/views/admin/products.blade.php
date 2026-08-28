<x-layouts.main-layout pageTitle="Admin - Produtos">
    <div style="padding: 20px; width: 100%; min-height: 100vh;">
        <div id="admin-products-app"></div>
    </div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/admin-products.jsx'])
    @endpush
</x-layouts.main-layout>