<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    private const RELATIONS = ['variants', 'specifications', 'category', 'images'];

    /** Regras compartilhadas entre store e update */
    private function rules(): array
    {
        return [
            'name'                     => 'required|string|min:3|max:255',
            'category_id'              => 'required|exists:categories,id',
            'description'              => 'nullable|string',
            'image'                    => 'nullable|string|max:2048',
            'active'                   => 'sometimes|boolean',

            'variants'                 => 'required|array|min:1',
            'variants.*.size'          => 'required|string|max:20',
            'variants.*.stock'         => 'required|integer|min:0',
            'variants.*.cost_price'    => 'nullable|numeric|min:0',
            'variants.*.price'         => 'required|numeric|min:0',
            'variants.*.barcode'       => 'nullable|string|max:60',

            'specifications'           => 'nullable|array',
            'specifications.*.label'   => 'nullable|string|max:100',
            'specifications.*.value'   => 'nullable|string|max:255',

            'images'                   => 'nullable|array|max:6',
            'images.*'                 => 'file|mimes:jpg,jpeg,png,webp|max:4096',
        ];
    }

    private function messages(): array
    {
        return [
            'name.required'             => 'O nome deve ser preenchido!',
            'name.min'                  => 'O nome deve ter no mínimo :min caracteres',
            'name.max'                  => 'O nome deve conter no máximo :max caracteres',
            'category_id.required'      => 'Selecione uma categoria',
            'category_id.exists'        => 'Categoria inválida',
            'variants.required'         => 'Adicione ao menos uma variação',
            'variants.*.size.required'  => 'Preencha o tamanho',
            'variants.*.stock.required' => 'Preencha o estoque',
            'variants.*.price.required' => 'Preencha o preço de venda',
            'images.max'                => 'Envie no máximo :max fotos',
            'images.*.mimes'            => 'As fotos devem ser JPG, PNG ou WEBP',
            'images.*.max'              => 'Cada foto deve ter no máximo 4MB',
        ];
    }

    // NORMALIZA VAIRAÇÕes: "" vira null nos campos opcionais
    private function normalizeVariants(array $variants): array
    {
        return collect($variants)->map(fn($v) => [
            'size' => $v['size'],
            'stock' => (int)$v['stock'],
            'cost_price' => filled($v['cost_price'] ?? null) ? $v['cost_price'] : null,
            'price' => $v['price'],
            'barcode' => filled($v['barcode'] ?? null) ? $v['barcode'] : null,
        ])->all();
    }

    /** Remove linhas vazias da ficha técnica e reordena */
    private function normalizeSpecs(array $specs): array
    {
        return collect($specs)
            ->filter(fn($s) => filled($s['label'] ?? null) && filled($s['value'] ?? null))
            ->values()
            ->map(fn($s, $i) => [
                'label'      => $s['label'],
                'value'      => $s['value'],
                'sort_order' => $i,
            ])
            ->all();
    }

    /** Salva os arquivos de imagem enviados e cria os registros em product_images */
    private function storeImages(Product $product, Request $request): void
    {
        if (!$request->hasFile('images')) return;

        foreach ($request->file('images') as $i => $file) {
            $path = $file->store('products', 'public');

            $product->images()->create([
                'path'       => $path,
                'sort_order' => $i,
            ]);
        }
    }

    public function index()
    {
        return response()->json(
            Product::where('active', true)
                ->with([
                    'variants:id,product_id,size,stock,price',
                    'category',
                    'images',
                ])
                ->latest()
                ->get()
        );
    }

    public function search(Request $request)
    {
        $data = $request->validate(['q' => 'required|string|min:2|max:100']);

        $term = $data['q'];

        $products = Product::where('active', true)
            ->where(function ($query) use ($term) {
                $query->where('name', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%");
            })
            ->with(['variants:id,product_id,size,stock,price', 'category', 'images'])
            ->latest()
            ->limit(20)
            ->get();

        return response()->json($products);
    }

    public function adminIndex()
    {
        return response()->json(
            Product::with(self::RELATIONS)->latest()->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules(), $this->messages());

        $product = DB::transaction(function () use ($data, $request) {
            $product = Product::create([
                'name'        => $data['name'],
                'category_id' => $data['category_id'],
                'description' => $data['description'] ?? null,
                'image'       => $data['image'] ?? null,
                'active'      => $data['active'] ?? true,
            ]);

            $product->variants()->createMany($this->normalizeVariants($data['variants']));

            if ($specs = $this->normalizeSpecs($data['specifications'] ?? [])) {
                $product->specifications()->createMany($specs);
            }

            $this->storeImages($product, $request);

            return $product;
        });

        return response()->json(
            $product->load(self::RELATIONS),
            201
        );
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $data    = $request->validate($this->rules(), $this->messages());

        DB::transaction(function () use ($data, $product, $request) {
            $product->update([
                'name'        => $data['name'],
                'category_id' => $data['category_id'],
                'description' => $data['description'] ?? null,
                'image'       => $data['image'] ?? null,
                'active'      => $data['active'] ?? $product->active,
            ]);

            /* ---- VARIAÇÕES: diff por tamanho, preserva IDs ---- */
            $incoming = $this->normalizeVariants($data['variants']);
            $keptIds  = [];

            foreach ($incoming as $row) {
                $variant = $product->variants()->firstOrNew(['size' => $row['size']]);
                $variant->fill($row)->save();
                $keptIds[] = $variant->id;
            }

            $product->variants()
                ->whereNotIn('id', $keptIds)
                ->whereDoesntHave('orderItems')
                ->delete();

            /* ---- FICHA TÉCNICA: pode recriar, não tem histórico ---- */
            $product->specifications()->delete();
            if ($specs = $this->normalizeSpecs($data['specifications'] ?? [])) {
                $product->specifications()->createMany($specs);
            }

            // ----- IMAGENS -----
            foreach ($product->images as $image) {
                Storage::disk('public')->delete($image->path);
            }

            $product->images()->delete();

            $this->storeImages($product, $request);
        });

        return response()->json($product->fresh()->load(self::RELATIONS));
    }

    public function destroy($id)
    {
        Product::findOrFail($id)->delete();
        return response()->json(['message' => 'Produto removido com sucesso.']);
    }

    public function show($id)
    {
        $product = Product::findOrFail($id);

        return view('produto', [
            'productId'       => $product->id,
            'pageTitle'       => $product->name, // ou "Detalhes do Produto"
            'metaDescription' => $product->description ?? 'Confira este produto em nossa loja',
            'metaImage'       => $product->image_url ?? '',
            'metaType'        => 'product',
        ]);
    }

    public function showData($id)
    {
        $product = Product::where('active', true)
            ->with([
                'variants:id,product_id,size,stock,price',
                'specifications',
                'category',
                'images',
                'reviews.user',
            ])
            ->findOrFail($id);

        return response()->json([
            ...$product->toArray(),
            'reviews_count' => $product->reviews->count(),
            'rating_avg' => $product->reviews->count()
                ? round($product->reviews->avg('rating'), 1)
                : null,
            'reviews' => $product->reviews->map(fn($r) => [
                'id' => $r->id,
                'ratting' => $r->rating,
                'comment' => $r->comment,
                'is_verified' => !is_null($r->user->name),
            ]),
        ]);
    }

    public function adminShow($id)
    {
        return response()->json(
            Product::with(self::RELATIONS)->findOrFail($id)
        );
    }

    public function edit($id)
    {
        Product::findOrFail($id);
        return view('admin.products', ['productId' => $id]);
    }
}
