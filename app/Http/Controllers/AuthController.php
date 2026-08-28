<?php

namespace App\Http\Controllers;


use App\Mail\ResetPassword;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Mail;
use App\Services\CartService;


class AuthController extends Controller
{
    public function login(): View
    {
        return view('auth.login');
    }


    public function authenticate(Request $request): RedirectResponse
    {
        $credentials = $request->validate(
            [
                'username' => 'required|min:3|max:30',
                'password' => 'required|min:8|max:32|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/'
            ],
            [
                'username.required' => 'O usuário é obrigatório',
                'username.min' => 'O usuário deve ter no minimo :min caracteres',
                'username.max' => 'O usuário deve ter no máximo :min caracteres',
                'password.required' => 'A senha é obrigatória',
                'password.min' => 'A senha deve ter no mínimo :min caracteres',
                'password.max' => 'A senha deve ter no máximo :max caracteres',
                'password.regex' => 'A senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número'
            ]
        );

        // Chave por usuário — protege a CONTA, não só o IP (evita que troca de IP burle a trava)
        $throttleKey = 'login:' . Str::lower($credentials['username']);

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $minutos = ceil(RateLimiter::availableIn($throttleKey) / 60);
            return back()->withInput()->with([
                'invalid_login' => "Muitas tentativas. Tente novamente em {$minutos} minuto(s)."
            ]);
        }

        $user = User::where('username', $credentials['username'])
            ->where('active', true)
            ->where(function ($query) {
                $query->whereNull('blocked_until')
                    ->orWhere('blocked_until', '<=', now());
            })
            ->whereNotNull('email_verified_at')
            ->whereNull('deleted_at')
            ->first();

        if (!$user || !password_verify($credentials['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 900); // janela de 15 min

            // Estourou o limite agora? Persiste o bloqueio na própria conta.
            // Isso sobrevive a um "php artisan cache:clear" e fica visível pra você direto no banco.
            if ($user && RateLimiter::tooManyAttempts($throttleKey, 5)) {
                $user->blocked_until = now()->addMinutes(15);
                $user->save();
            }

            return back()->withInput()->with([
                'invalid_login' => 'Login inválido'
            ]);
        }

        RateLimiter::clear($throttleKey);

        $user->last_login_at = now();
        $user->blocked_until = null;
        $user->save();

        $guestSessionId = session()->getId();
        $request->session()->regenerate();
        Auth::login($user);

        app(CartService::class)->mergeGuestCart($user->id, $guestSessionId);

        return redirect()->intended(route('home'));
    }

    public function logout(): RedirectResponse
    {
        // logout
        Auth::logout();
        return redirect()->route('login');
    }

    public function register(Request $request)
    {
        return view('auth.register');
    }

    public function store_user(Request $request): RedirectResponse | View
    {
        $request->validate(
            [
                'username' => 'required|min:3|max:255|unique:users,username',
                'email' => 'required|email|unique:users,email',
                'password' => 'required|min:8|max:32|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/',
                'password_confirmation' => 'required|same:password',
                'accpet_terms' => 'required|accepted',
            ],
            [
                'username.required' => 'Preencha este campo!',
                'username.min' => 'O campo deve conter no mínimo :min caracteres',
                'username.max' => 'O campo deve conter no máximo :max caracteres',
                'email.required' => 'Preencha este campo!',
                'email.email' => 'O email deve ser válido!',
                'email.unique' => 'Este e-mail não pode ser usado!',
                'password.required' => 'Preencha este campo!',
                'password.min' => 'O campo deve conter no mínimo :min caracteres!',
                'passowrd.max' => 'O campo deve conter no máximo :max caracteres!',
                'password.regex' => 'A senha deve conter pelo menos uma letra maiúscula, uma letra minúscula e um número',
                'password_confirmation.required' => 'O campo deve ser preenchido',
                'password_confirmation.same' => 'As senhas não coincidem!',
                'accept_terms.required' => 'Você precisa aceitar os termos para continuar.',
                'accept_terms.accepted' => 'Você precisa aceitar os termos para continuar.',
            ]
        );

        $user = new User();
        $user->username = $request->username;
        $user->email = $request->email;
        $user->password = bcrypt($request->password);
        $user->role_id = 2;
        $user->active = true;
        $user->email_verified_at = now();
        $user->terms_accept_at = now();
        $user->save();

        Auth::login($user);
        $request->session()->regenerate();

        return redirect()->route('home');
    }

    public function new_user_confirmation($token)
    {
        // verificar se o token é valido
        $user = User::where('token', $token)->first();
        if (!$user) {
            return redirect()->route('login');
        }

        // confirmar o registro do usuario
        $user->email_verified_at = Carbon::now();
        $user->token = null;
        $user->active = true;
        $user->save();

        //autenticação automatica (login) do usuario confirmado
        Auth::login($user);

        // apresenta uma mensagem de sucesso
        return view('auth.new_user_confirmation');
    }

    public function profile(): View
    {
        return view('auth.profile', ['authEmail' => Auth::user()->email]);
    }

    public function change_password(Request $request)
    {
        // form validate
        $request->validate(
            [
                'current_password' => 'required|min:8|max:32|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/',
                'new_password' => 'required|min:8|max:32|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/|different:current_password',
                'new_password_confirmation' => 'required|same:new_password'
            ],
            [
                'current_password.required' => 'A senha atual é obrigatória.',
                'current_password.min' => 'A senha atual deve conter no mínimo :min caracteres.',
                'current_password.max' => 'A senha atual deve conter no máximo :max caracteres.',
                'current_password.regex' => 'A senha atual deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
                'new_password.required' => 'A senha atual é obrigatória.',
                'new_password.min' => 'A senha atual deve conter no mínimo :min caracteres.',
                'new_password.max' => 'A senha atual deve conter no máximo :max caracteres.',
                'new_password.different' => 'A nova senha deve ser diferente da atual.',
                'new_password_confirmation.required' => 'A confirmação da nova senha é obrigatória',
                'new_password_confirmation.same' => 'A confirmação da nova senha deve ser igual á nova.'
            ]
        );

        // verificar se a password atual (current_password) esta correta
        if (!password_verify($request->current_password, Auth::user()->password)) {
            return back()->with([
                'server_error' => 'A senha atual está incorreta'
            ]);
        }

        // atualizar a senha na base de dados
        $user = Auth::user();
        $user->password = bcrypt($request->new_password);
        $user->save();

        // atualizar a password na sessão
        // Auth::user()->password = $request->new_password;

        // apresentar uma mensagem de sucesso
        return redirect()->route('profile')->with([
            'success' => 'A senha foi atualizada com sucesso.'
        ]);
    }

    public function changePasswordApi(Request $request)
    {
        $request->validate([
            'current_password'      => 'required|min:8|max:32|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/',
            'new_password'          => 'required|min:8|max:32|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/|different:current_password',
            'new_password_confirmation' => 'required|same:new_password',
        ]);

        if (!password_verify($request->current_password, Auth::user()->password)) {
            return response()->json(['message' => 'A senha atual está incorreta.'], 400);
        }

        $user = Auth::user();
        $user->password = bcrypt($request->new_password);
        $user->save();

        return response()->json(['message' => 'Senha alterada com sucesso!']);
    }

    public function deleteAccountApi(Request $request)
    {
        if ($request->deleted_confirmation !== 'ELIMINAR') {
            return response()->json(['message' => 'Confirmação inválida.'], 422);
        }

        $user = Auth::user();
        $user->delete();
        Auth::logout();

        return response()->json(['message' => 'Conta eliminada.']);
    }

    public function forgot_password(): View
    {
        return view('auth.forgot_password');
    }

    public function send_reset_password_link(Request $request)
    {
        // form validation
        $request->validate(
            [
                'email' => 'required|email',
            ],
            [
                'email.required' => 'O email é obrigatório.',
                'email.email' => 'O email deve ser um endereço de email válido.'
            ]
        );

        $generic_message = "Verifique a sua caixa de correio para prosseguir com a recuperação de senha.";

        // verificar se email existe
        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return back()->with([
                'server_message' => $generic_message
            ]);
        }

        // criar o link com token para envial o email
        $user->token = Str::random(64);
        $user->save();

        $token_link = route('reset_password', [
            'token' => $user->token
        ]);

        Mail::to($user->email)->send(
            new ResetPassword($user->username, $token_link)
        );

        return back()->with([
            'server_message' => $generic_message
        ]);
    }

    public function reset_password($token): View | RedirectResponse
    {
        // verificar se o token é valido
        $user = User::where('token', $token)->first();
        if (!$user) {
            return redirect()->route('login');
        }

        return view('auth.reset_password', ['token' => $token]);
    }

    public function reset_password_update(Request $request): RedirectResponse
    {
        // form validation 
        $request->validate(
            [
                'token' => 'required',
                'new_password' => 'required|min:8|max:32|regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/',
                'new_password_confirmation' => 'required|same:new_password',
            ],
            [
                'new_password.required' => 'A nova senha é obrigatória.',
                'new_password.min' => 'A nova senha deve conter no mínimo :min caracteres.',
                'new_password.max' => 'A nova senha deve conter no máximo :max caracteres.',
                'new_password.regex' => 'A nova senha deve conter pelo menos uma letra maiuscula, uma letra minuscula e um número.',
                'new_password_confirmation.required' => 'A confirmação da nova senha é obrigatória.',
                'new_password_confirmation.same' => 'A confirmação da nova senha deve ser igual à nova senha.'
            ]
        );

        // verifica se o token é válido
        $user = User::where('token', $request->token)->first();
        if (!$user) {
            return redirect()->route('login');
        }

        // atualizar a senha na base de dados
        $user->password = bcrypt($request->new_password);
        $user->save();

        return redirect()->route('login')->with([
            'success' => true
        ]);
    }

    public function categoria(): View
    {
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Acesso não autorizado.');
        }

        return view('auth.categoria');
    }

    public function deleted_account(Request $request): RedirectResponse
    {
        // validação do formulário
        $request->validate(
            [
                'deleted_confirmation' => 'required|in:ELIMINAR'
            ],
            [
                'deleted_confirmation.required' => 'A confirmação é obrigatória',
                'deleted_confirmation.in' => 'É obrigatório escrever a palavra ELIMINAR'
            ]
        );

        //remover a conta do usuário soft delete
        $user = Auth::user();
        $user->delete();

        // logout
        Auth::logout();

        // redirect
        return redirect()->route('login')->with(['account_deleted' => true]);
    }
}
