<x-layouts.loja-layout pageTitle="Perfil">
    <div id="profile-app" style="width: 100%; min-height: 60vh;"></div>

    @php
        $authUserPayload = [
            'id' => auth()->id(),
            'username' => auth()->user()->username ?? auth()->user()->name,
            'role_id' => auth()->user()->role_id,
            'role' => auth()->user()->role_id == 1 ? 'admin' : (auth()->user()->role->name ?? 'User'),
        ];
    @endphp

    <script>
        window.authEmail = @json($authEmail);
        window.authUser = @json($authUserPayload);
    </script>

    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/profile.jsx'])
    @endpush
</x-layouts.loja-layout>
