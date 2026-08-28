<x-layouts.loja-layout
    :pageTitle="$pageTitle"
    :metaDescription="$metaDescription"
    :metaImage="$metaImage"
    :metaType="$metaType"
>
<div id="product-app" data-product-id="{{ $productId }}"></div>

@push('scripts')
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/produto.jsx'])
@endpush

</x-layouts.loja-layout>