<?php

namespace App\Http\Controllers;

use App\Models\WhatsappCLick;
use Illuminate\Http\Request;

class WhatsappClickController extends Controller
{
    private function rules() : array
    {
        return [
            'order_code' => 'nullable|string|max:20|exists:orders,code',
            'product_name' => 'nullable|string|max:255',
        ];
    }
    private function message() : array
    {
        return [
            'order_code.exists' => 'Pedido inválido.',
            'order_code.max' => 'Código de pedido inválido.',
        ];
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules(), $this->message());

        WhatsappClick::create([
            'user_id' => auth()->id(),
            'order_code' => $data['order_code'] ?? null,
            'product_name' => $data['products_name'] ?? null,
            'page_url' => url()->previous(),
        ]);

        return response()->json(['ok' => true]);
    }
}
