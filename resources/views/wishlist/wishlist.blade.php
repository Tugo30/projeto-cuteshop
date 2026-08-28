<x-layouts.main-layout pageTitle="Favoritos">
    <div class="container py-4">
        <div id="wishlist-app"></div>
    </div>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/wishlist.jsx'])
    @endpush
</x-layouts.main-layout>