<?php

namespace App\Http\Requests;

use App\Http\Rules\CepValido;
use App\Http\Rules\CpfOuCnpj;
use App\Http\Rules\TelefoneValido;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCheckoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $ufs = [
            'AC',
            'AL',
            'AP',
            'AM',
            'BA',
            'CE',
            'DF',
            'ES',
            'GO',
            'MA',
            'MT',
            'MS',
            'MG',
            'PA',
            'PB',
            'PR',
            'PE',
            'PI',
            'RJ',
            'RN',
            'RS',
            'RO',
            'RR',
            'SC',
            'SP',
            'SE',
            'TO',
        ];

        return [
            'customer_name'     =>  ['required', 'string', 'min:3', 'regex:/[a-zA-ZÀ-ÿ]/'],
            'customer_email'    =>  ['required', 'email:rfc,dns', 'max:255'],
            'customer_phone'    =>  ['required', 'string', new TelefoneValido],
            'customer_document'  =>  ['required', 'string', new CpfOuCnpj],
            'ship_zipcode'      =>  ['required', 'string', new CepValido],
            'ship_street'       =>  ['required', 'string', 'max:255'],
            'ship_number'       =>  ['required', 'string', 'max:20'],
            'ship_district'     =>  ['required', 'string', 'max:100'],
            'ship_city'         =>  ['required', 'string', 'max:100'],
            'ship_state'        =>  ['required', 'string', 'size:2', Rule::in($ufs)],
            'ship_complement'   =>  ['nullable', 'string', 'max:100'],
            'payment_method'    => ['required', 'in:pix,boleto,credit_card'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_name.regex' => 'Nome não pode conter apeas números.',
            'ship_state.in'       =>  'UF inválida.'

        ];
    }

    /**
     * Roda depois da validação padrão - dados já limpos e normalizados.
     */

    protected function passedValidation(): void
    {
        $this->merge([
            'ship_zipcode'      => preg_replace('/\D/', '', $this->ship_zipcode),
            'customer_phone'    => preg_replace('/\D/', '', $this->customer_phone),
            'customer_document' => preg_replace('/\D/', '', $this->customer_document),
            'customer_name'     => trim(strip_tags($this->customer_name))
        ]);
    }
}
