<x-layouts.main-layout pageTitle="Cadastrar Cliente">
    <div class="container py-4">
        <div id="client-create-app"></div>
    </div>
    <script>
        window.clientGroups = @json(\App\Models\ClientGroup::all());
    </script>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/client-create.jsx'])
    @endpush
</x-layouts.main-layout>
