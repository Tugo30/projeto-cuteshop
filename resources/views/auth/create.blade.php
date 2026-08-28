<x-layouts.main-layout pageTitle="Criar Usuário">

    <div class="container py-4">
        <div id="app"></div>
    </div>

    <script>
        window.roles = @json($roles);
    </script>

    @push('scripts')
        @viteReactRefresh
        @vite('resources/js/app.jsx')
    @endpush

</x-layouts.main-layout>