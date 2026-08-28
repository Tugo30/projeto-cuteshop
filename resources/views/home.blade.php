<x-layouts.loja-layout pageTitle="Home">
    <div id="storefront-app" style="width: 100%; min-height: 100vh; margin: 0; padding: 0;"></div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/storefront.jsx'])
    @endpush
</x-layouts.loja-layout>