<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Review;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function store(Request $request, $productId)
    {
        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $userId = $request->user()->id;

        //confirma que o usuário realmente comprou este produto
        $order = OrderItem::whereHas('order', fn($q) => $q
            ->where('user_id', $userId)
            ->where('status', 'delivered'))
        ->where('product_id', $productId)
        ->first();

        if(!$order){
            return response()->json([
                'message' => 'Você só pode avaliar produtos que já comprou.'
            ], 403);
        }

        $review = Review::updateOrCreate(
            ['user_id' => $userId, 'product_id' => $productId],
            [
                'order_id' => $order->order_id,
                'rating' => $data['rating'],
                'comment' => $data['comment'] ?? null,
                'approved' => true,
            ]
        );
        return response()->json($review->load('user'));
    }
}
