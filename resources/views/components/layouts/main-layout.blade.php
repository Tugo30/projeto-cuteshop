<!DOCTYPE html>
<html lang="pt">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $pageTitle }}</title>
    <link rel="stylesheet" href="{{ asset('assets/fontawesome/css/all.min.css') }}">
    <link rel="stylesheet" href="{{ asset('assets/css/main.css') }}">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <link rel="shortcut icon" href="{{ asset('assets/images/favicon.png') }}" type="image/png">
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">

    @vite(['resources/css/app.css'])

    <script>
        @auth
            window.authUser = {!! json_encode([
                'id' => auth()->user()->id,
                'username' => auth()->user()->username ?? auth()->user()->name,
                'role_id' => auth()->user()->role_id,
                // Se o role_id for 1, garante que vai como 'admin'
                'role' => (auth()->user()->role_id == 1) ? 'admin' : (auth()->user()->role->name ?? 'User')
            ]) !!};
        @else
            window.authUser = null;
        @endauth
    </script>
</head>

<body style="margin: 0;">

 
    @auth
       @if(auth()->user()->isAdmin())
            <div id="sidebar-app"></div>
        @endif
    @endauth

    <div id="main-content" style="min-height: 100vh; background: #f9f9f9; margin-left: 240px;">
        <style>
            @media (max-width: 767px) {
                #main-content {
                    margin-left: 0 !important;
                    padding-top: 56px;
                }
            }
        </style>
        {{ $slot }}
    </div>

    <script src="{{ asset('assets/bootstrap/bootstrap.bundle.min.js') }}"></script>
    <script src="{{ asset('assets/js/main.js') }}"></script>

    @auth
        @viteReactRefresh
        @vite(['resources/js/sidebar.jsx'])
    @endauth
    @stack('scripts')
    <x-whatsapp-support-button />
</body>

</html>
