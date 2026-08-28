<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use Illuminate\Http\Request;

class PaymentMethodController extends Controller
{
    public function index()
    {
        return view('payment-methods.index');
    }

    public function store(Request $request)
    {
        $validated = $request->validate(
            [
                'nome' => 'required|string|max:100|unique:payment_methods,nome',
            ],
            [
                'nome.required' => 'O nome é obrigatório.',
                'nome.unique'   => 'Essa forma de pagamento já existe.',
            ]
        );

        $method = PaymentMethod::create($validated);

        return response()->json($method, 201);
    }

    public function data()
    {
        return response()->json(PaymentMethod::all());
    }

    public function destroy($id)
    {
        PaymentMethod::findOrFail($id)->delete();
        return response()->json(['message' => 'Excluído com sucesso!']);
    }
}
