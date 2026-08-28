<x-layouts.main-layout pageTitle="Admin - Categories">
    <div style="padding: 20px; width:100%; min-height:100vh">
        <div id="admin-categories-app"></div>
    </div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/admin-categories.jsx'])
    @endpush
</x-layouts.main-layout>