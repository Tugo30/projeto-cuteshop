<?php
// app/Rules/TelefoneValido.php
namespace App\Http\Rules;

use Illuminate\Contracts\Validation\ValidationRule;
use Closure;

class TelefoneValido implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $tel = preg_replace('/\D/', '', (string) $value);
        // DDD (2) + 8 ou 9 dígitos
        if (! preg_match('/^\d{10,11}$/', $tel)) {
            $fail('Telefone inválido.');
        }
    }
}
