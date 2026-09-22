<?php

namespace App\Http\Requests\Cart;

use App\Http\Rules\CepValido;
use Illuminate\Foundation\Http\FormRequest;

class CalculateShippingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cep' => ['required', 'string', new CepValido],
        ];
    }

    protected function passedValidation(): void
    {
        $this->merge(['cep' => preg_replace('/\D/', '', $this->cep)]);
    }
}
