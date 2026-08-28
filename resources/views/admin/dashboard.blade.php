<x-layouts.main-layout pageTitle="Dashboard">
    <div class="container py-4">
        <div id="admin-dashboard-app"></div>
    </div>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/admin-dashboard.jsx'])
    @endpush
</x-layouts.main-layout>