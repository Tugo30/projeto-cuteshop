<?php

namespace App\Http\Requests\Cart;

use Illuminate\Foundation\Http\FormRequest;

class ApplyCouponRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'codigo' => ['required', 'string', 'max:50', 'regex:/^[A-Za-z0-9_-]+$/'],
        ];
    }

    protected function passedValidation(): void
    {
        $this->merge(['codigo' => strtoupper(trim($this->codigo))]);
    }
}
