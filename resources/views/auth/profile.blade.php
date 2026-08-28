<x-layouts.main-layout pageTitle="Perfil">
    <div class="container py-4">
        <div id="profile-app"></div>
    </div>
    <script>
        window.authEmail = "{{ $authEmail }}";
    </script>
    @push('scripts')
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/profile.jsx'])
    @endpush
</x-layouts.main-layout>
