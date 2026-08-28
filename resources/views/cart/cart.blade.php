<x-layouts.loja-layout pageTitle="Minha sacola">
    <div id="cart-app" style="width: 100%; min-height: 60vh;"></div>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/cart-page.jsx'])
    @endpush
</x-layouts.loja-layout>