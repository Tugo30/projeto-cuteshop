<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class WishlistController extends Controller
{

    public function page()
    {
        return view('wishlist.wishlist');
    }

    public function index(Request $request)
    {
        $products = $request->user()->wishlist()
            ->with(['images', 'variants:id,product_id,size,price,stock', 'coverImage'])
            ->get();

        return response()->json([
            'items' => $products,
            'count' => $products->count(),
        ]);
    }

    public function toggle(Request $request, Product $product)
    {
        abort_unless($product->active, 404);

        $user = $request->user();
        $exists = $user->wishlist()->where('product_id', $product->id)->exists();

        if ($exists) {
            $user->wishlist()->detach($product->id);
            $inWishlist = false;
        } else {
            $user->wishlist()->attach($product->id);
            $inWishlist = true;
        }

        return response()->json([
            'in_wishlist' => $inWishlist,
            'count'       => $user->wishlist()->count(),
        ]);
    }

    public function check(Request $request, Product $product)
    {
        $inWishlist = $request->user()->wishlist()->where('product_id', $product->id)->exists();
        return response()->json(['in_wishlist' => $inWishlist]);
    }
}
