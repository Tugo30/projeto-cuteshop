<x-layouts.main-layout pageTitle="Editar Usuário">
    <div class="container py-4">
        <div id="edit-app"></div>
    </div>

    <script>
        window.editUserId = {{ $userId }};
        window.roles = @json($roles);
    </script>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/edit.jsx'])
    @endpush
</x-layouts.main-layout>