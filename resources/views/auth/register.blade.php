<x-layouts.loja-layout pageTitle="Criar Conta — zLuz">
<div style="max-width: 420px; margin: 80px auto; padding: 0 20px;">
    <h1 style="font-family: serif; font-style: italic; font-size: 32px; margin-bottom: 8px;">Criar conta</h1>
    <p style="color: #666; font-size: 14px; margin-bottom: 32px;">Cadastre-se para acompanhar seus pedidos.</p>

    <form method="POST" action="{{ route('store_user') }}" style="display:flex;flex-direction:column;gap:16px;">
        @csrf
        <div>
            <label style="display:block;font-size:12px;margin-bottom:4px;">Usuário</label>
            <input type="text" name="username" value="{{ old('username') }}" required
                style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:2px;box-sizing:border-box;">
            @error('username') <small style="color:#b91c1c;">{{ $message }}</small> @enderror
        </div>
        <div>
            <label style="display:block;font-size:12px;margin-bottom:4px;">E-mail</label>
            <input type="email" name="email" value="{{ old('email') }}" required
                style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:2px;box-sizing:border-box;">
            @error('email') <small style="color:#b91c1c;">{{ $message }}</small> @enderror
        </div>
        <div>
            <label style="display:block;font-size:12px;margin-bottom:4px;">Senha</label>
            <input type="password" name="password" required
                style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:2px;box-sizing:border-box;">
            @error('password') <small style="color:#b91c1c;">{{ $message }}</small> @enderror
        </div>
        <div>
            <label style="display:block;font-size:12px;margin-bottom:4px;">Confirmar senha</label>
            <input type="password" name="password_confirmation" required
                style="width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:2px;box-sizing:border-box;">
        </div>

        <div>
            <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px; color: #555;"> 
                <input type="checkbox" name="accept_terms" value="1" style="margin-top:2px;" />    
                <span>
                    Li e concordo com a
                    <a href="{{ route('legal.privacy') }}" target="_blank" style="font-wight: 600;">Políticas de privacidade </a>
                    e os
                    <a href="{{ route('legal.terms') }}" target="_blank" style="font-weight:600;">Termos de Uso</a>.
                </span>
            </label>    
            @error('accept_terms')
                <small style="color:#b91c1c; display:block; margin-top:4px;">{{ $message }}</small>
            @enderror
        </div>        

        <button type="submit" style="background:#000;color:#fff;padding:12px;border:none;border-radius:2px;font-weight:600;cursor:pointer;">
            Criar Conta
        </button>
    </form>

    <p style="text-align:center;margin-top:24px;font-size:13px;color:#666;">
        Já tem conta? <a href="{{ route('login') }}" style="font-weight:600;">Entrar</a>
    </p>
</div>
</x-layouts.loja-layout>