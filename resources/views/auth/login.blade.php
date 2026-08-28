<x-layouts.loja-layout pageTitle="Entrar — zLuz">
<div style="max-width: 420px; margin: 80px auto; padding: 0 20px;">
    <h1 style="font-family: serif; font-style: italic; font-size: 32px; margin-bottom: 8px;">Entrar</h1>
    <p style="color: #666; font-size: 14px; margin-bottom: 32px;">Acesse sua conta zLuz.</p>

    @if (session('invalid_login'))
        <div style="background:#FEE2E2;color:#991B1B;padding:12px;border-radius:4px;font-size:13px;margin-bottom:16px;">
            {{ session('invalid_login') }}
        </div>
    @endif

    <form method="POST" action="{{ route('authenticate') }}" style="display:flex;flex-direction:column;gap:16px;">
        @csrf
        <div>
            <label style="display:block;font-size:12px;margin-bottom:4px;">Usuário</label>
            <input type="text" name="username" value="{{ old('username') }}" required
                style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:2px;box-sizing:border-box;">
            @error('username') <small style="color:#b91c1c;">{{ $message }}</small> @enderror
        </div>
        <div>
            <label style="display:block;font-size:12px;margin-bottom:4px;">Senha</label>
            <input type="password" name="password" required
                style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:2px;box-sizing:border-box;">
            @error('password') <small style="color:#b91c1c;">{{ $message }}</small> @enderror
        </div>
        <button type="submit" style="background:#000;color:#fff;padding:12px;border:none;border-radius:2px;font-weight:600;cursor:pointer;">
            Entrar
        </button>
    </form>

    <p style="text-align:center;margin-top:24px;font-size:13px;color:#666;">
        Ainda não tem conta? <a href="{{ route('register') }}" style="font-weight:600;">Cadastre-se</a>
    </p>
</div>
</x-layouts.loja-layout>