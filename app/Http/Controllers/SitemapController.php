<?php

namespace App\Http\Controllers;

use App\Models\Product;

class SitemapController extends Controller
{
    public function index()
    {
        $products = Product::where('active', true)->select('id', 'updated_at')->get();

        $urls = collect([
            ['loc' => url('/'), 'priority' => '1.0'],
        ]);

        foreach ($products as $product) {
            $urls->push([
                'loc'        => url("/produtos/{$product->id}"),
                'lastmod'    => $product->updated_at->toAtomString(),
                'priority'   => '0.8',
            ]);
        }

        return response()
            ->view('sitemap', ['urls' => $urls])
            ->header('Content-Type', 'text/xml');
    }
}