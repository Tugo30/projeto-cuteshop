<?php

namespace App\Http\Requests;

use App\Http\Rules\CepValido;
use Illuminate\Foundation\Http\FormRequest;

class QuoteProductShippingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'cep' => preg_replace('/\D/', '', (string) $this->input('cep')),
            'quantity' => max(1, (int) $this->input('quantity', 1)),
        ]);
    }

    public function rules(): array
    {
        return [
            'cep' => ['required', 'string', new CepValido],
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
