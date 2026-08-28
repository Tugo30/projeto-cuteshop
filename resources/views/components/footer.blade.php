<footer style="background: #111; color: #ccc; padding: 40px 24px; margin-top: 80px; font-size: 13px">
    <div style="max-width: 1100px; margin: 0 auto; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 24px">
        <p style="margin 0;">&copy; {{ now()->year }} zLuz. Todos os direitos reservados.</p>
        <div style="display: flex; gap: 20px;">
            <a href="{{ route('legal.privacy') }}" style="color: #ccc; text-decoration: none;">Política de Privacidade</a>
            <a href="{{ route('legal.terms') }}" style="color: #ccc; text-decoration: none;">Termos de Uso</a>
        </div>        
    </div>
     <div style="max-width: 1100px; margin: 16px auto 0; text-align: center; font-size: 11px; color: #666;">
        Desenvolvido por Arthur Sant'ana
     </div>

</footer>
