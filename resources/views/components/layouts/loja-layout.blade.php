<!DOCTYPE html>
<html lang="pt">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width", initial-scale="1.0">
    <title>{{ $pageTitle }}</title>

    <meta name="description" content=" {{  $metaDescription ?? 'zLuz - moda com estilo, do jeito que você gosta.' }}">

    <meta property="og:title" content="{{  $pageTitle }}">
    <meta property="og:description" content="{{  $metaDescription ?? 'zLuz - moda com estilo, do jeito que você gosta.' }}">
    <meta property="og:image" content = "{{ $metaImage ?? asset('assets/images/favicon.png') }}">
    <meta property="og:url" content="{{ $metaUrl ?? url()->current() }}">
    <meta property="og:type" content="{{ $metaType ?? 'website' }}">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content=" {{ $pageTitle }}">
    <meta name="twitter:description" content="{{ $metaDescription ?? 'zLuz - moda com estilo, do jeito que você gosta.' }}">
    <meta name="twitter::image" content="{{ $metaImage ?? asset('assets/images/favicon.png') }}">

    <link rel="stylesheet" href="{{ asset('assets/bootstrap/bootstrap.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/fontawesome/css/all.min.css') }}">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="shortcut icon" href="{{ asset('assets/images/favicon.png') }}" type="image/pgn">
    
</head>

<body style="margin: 0;">

    <div id="main-content" style="min-height: 100vh; background: #f9f9f9;">
        {{ $slot }}
    </div>

    <x-footer />

    <script src="{{ asset('assets/bootstrap/bootstrap.bundle.min.js') }}"></script>
    <script src="{{ asset('assets/js/main.js') }}"></script>
    @stack('scripts')
</body>

</html>