<?php

namespace App\Http\Rules;

use Illuminate\Contracts\Validation\ValidationRule;
use Closure;

class CepValido implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $cep = preg_replace('/\D/', '', (string) $value);
        if(strlen($cep) !== 8){
            $fail('CEP deve conter 8 digítos.');
        }
    }
}