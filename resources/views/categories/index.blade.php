<x-layouts.main-layout pageTitle="Categorias">
    <div class="container py-4">
        <div id="categories-app"></div>
    </div>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/categories.jsx'])
    @endpush
</x-layouts.main-layout>
