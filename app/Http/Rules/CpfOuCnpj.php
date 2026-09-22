<?php

namespace App\Http\Rules;

use Illuminate\Contracts\Validation\ValidationRule;
use Closure;

class CpfOuCnpj implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $doc = preg_replace('/\D/', '', (string) $value);

        if (strlen($doc) === 11) {
            if (! $this->validarCpf($doc)) {
                $fail('CPF inválido.');
            }
            return;
        }

        if (strlen($doc) === 14) {
            if (! $this->validarCnpj($doc)) {
                $fail('CNPJ inválido.');
            }
            return;
        }

        $fail('Documento deve ser um CPF ou CNPJ válido.');
    }

    private function validarCpf(string $cpf): bool
    {
        if (preg_match('/^(\d)\1{10}$/', $cpf)) return false; // 111.111.111-11 etc.

        for ($t = 9; $t < 11; $t++) {
            $soma = 0;
            for ($i = 0; $i < $t; $i++) {
                $soma += $cpf[$i] * (($t + 1) - $i);
            }
            $digito = ((10 * $soma) % 11) % 10;
            if ((int) $cpf[$t] !== $digito) return false;
        }

        return true;
    }

    private function validarCnpj(string $cnpj): bool
    {
        if (preg_match('/^(\d)\1{13}$/', $cnpj)) return false;

        $pesos1 = [5,4,3,2,9,8,7,6,5,4,3,2];
        $pesos2 = [6,5,4,3,2,9,8,7,6,5,4,3,2];

        foreach ([$pesos1, $pesos2] as $i => $pesos) {
            $tam = $i === 0 ? 12 : 13;
            $soma = 0;
            for ($j = 0; $j < $tam; $j++) {
                $soma += $cnpj[$j] * $pesos[$j];
            }
            $resto = $soma % 11;
            $digito = $resto < 2 ? 0 : 11 - $resto;
            if ((int) $cnpj[$tam] !== $digito) return false;
        }

        return true;
    }
}
