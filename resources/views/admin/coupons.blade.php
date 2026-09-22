<x-layouts.main-layout pageTitle="Admin - Coupons">
    <div style="padding: 20px; width:100%; min-height:100vh">
        <div id="admin-coupons-app"></div>
    </div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/admin-coupons.jsx'])
    @endpush
</x-layouts.main-layout>