<x-layouts.main-layout pageTitle="Editar Cliente">
    <div class="container py-4">
        <div id="client-edit-app"></div>
    </div>
    <script>
        window.clientId = {{ $clientId }};
        window.clientGroups = @json($groups);
    </script>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/client-edit.jsx'])
    @endpush
</x-layouts.main-layout>