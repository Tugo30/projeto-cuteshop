<x-layouts.main-layout pageTitle="Serviços">
    <div class="container py-4">
        <div id="services-app"></div>
    </div>
    <script>
        window.categories = @json($categories);
    </script>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/services.jsx'])
    @endpush
</x-layouts.main-layout>