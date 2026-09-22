<?php

namespace App\Http\Requests\Cart;

use App\Http\Rules\CepValido;
use Illuminate\Foundation\Http\FormRequest;

class SelectShippingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'cep'     => ['required', 'string', new CepValido],
            'service' => ['required', 'string', 'max:100'],
        ];
    }

    protected function passedValidation(): void
    {
        $this->merge(['cep' => preg_replace('/\D/', '', $this->cep)]);
    }
}
