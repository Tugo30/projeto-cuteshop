<x-layouts.main-layout pageTitle="Usuários">
    <div class="container py-4">
        <div id="users-app"></div>
    </div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/users.jsx'])
    @endpush
</x-layouts.main-layout>