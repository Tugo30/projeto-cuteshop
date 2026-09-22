<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ReviewController extends Controller
{
    public function store(Request $request, $productId)
    {
        $data = $request->validate([
            'rating'    => 'required|integer|min:1|max:5',
            'comment'   => 'nullable|string|max:1000',
            'photos'    => 'nullable|array|max:3',
            'photos.*'  => 'file|mimes:jpg,jpeg,png,webp|max:4096',
        ], [
            'photos.max'       => 'Envie no máximo :max fotos.',
            'photos.*.mimes'   => 'As fotos devem ser JPG, PNG ou WEBP.',
            'photos.*.max'     => 'Cada foto deve ter no máximo 4MB.',
        ]);

        $userId = $request->user()->id;

        // confirma que o usuário realmente comprou este produto
        $orderItem = OrderItem::whereHas('order', fn($q) => $q
            ->where('user_id', $userId)
            ->where('status', 'delivered'))
            ->where('product_id', $productId)
            ->first();

        if (!$orderItem) {
            return response()->json([
                'message' => 'Você só pode avaliar produtos que já comprou.'
            ], 403);
        }

        $review = Review::updateOrCreate(
            ['user_id' => $userId, 'product_id' => $productId],
            [
                'order_id' => $orderItem->order_id,
                'rating'   => $data['rating'],
                'comment'  => $data['comment'] ?? null,
                'approved' => true,
            ]
        );

        // Se reenviou fotos novas (ex: editando a avaliação), substitui as antigas
        if ($request->hasFile('photos')) {
            foreach ($review->photos as $old) {
                Storage::disk('public')->delete($old->path);
            }
            $review->photos()->delete();

            foreach ($request->file('photos') as $i => $file) {
                $path = $file->store('reviews', 'public');
                $review->photos()->create(['path' => $path, 'sort_order' => $i]);
            }
        }

        return response()->json($review->load('user', 'photos'));
    }
}
