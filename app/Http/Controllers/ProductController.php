<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Services\Stock\StockMovementService;
use App\Models\StockMovement;
use App\Services\Admin\AdminLogService;

class ProductController extends Controller
{
    private const RELATIONS = ['variants', 'specifications', 'category', 'images'];
    private const MAX_IMAGES = 6;

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

            'images'                   => 'nullable|array|max:' . self::MAX_IMAGES,
            'images.*'                 => 'file|mimes:jpg,jpeg,png,webp|max:4096',

            // Edição de imagens já salvas (não se aplica ao store)
            'removed_image_ids'        => 'nullable|array',
            'removed_image_ids.*'      => 'integer|exists:product_images,id',
            'cover_image_id'           => 'nullable|integer|exists:product_images,id',
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
            'images.max'                => 'Envie no máximo :max fotos por vez',
            'images.*.mimes'            => 'As fotos devem ser JPG, PNG ou WEBP',
            'images.*.max'              => 'Cada foto deve ter no máximo 4MB',
            'cover_image_id.exists'     => 'A foto escolhida como capa não pertence a este produto',
        ];
    }

    // NORMALIZA VARIAÇÕES: "" vira null nos campos opcionais
    private function normalizeVariants(array $variants): array
    {
        return collect($variants)->map(fn($v) => [
            'size'       => $v['size'],
            'stock'      => (int)$v['stock'],
            'cost_price' => filled($v['cost_price'] ?? null) ? $v['cost_price'] : null,
            'price'      => $v['price'],
            'barcode'    => filled($v['barcode'] ?? null) ? $v['barcode'] : null,
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

    /**
     * Salva os arquivos de imagem enviados, criando os registros em product_images.
     * Continua a numeração de sort_order a partir do que já existe (não zera),
     * e só marca a primeira nova imagem como capa se o produto ainda não tiver uma.
     */
    private function storeImages(Product $product, Request $request): void
    {
        if (!$request->hasFile('images')) {
            return;
        }

        $nextOrder = (int) ($product->images()->max('sort_order') ?? -1) + 1;
        $hasCover  = $product->images()->where('is_cover', true)->exists();

        foreach ($request->file('images') as $i => $file) {
            $path = $file->store('products', 'public');

            $product->images()->create([
                'path'       => $path,
                'sort_order' => $nextOrder + $i,
                'is_cover'   => !$hasCover && $i === 0,
            ]);

            if (!$hasCover && $i === 0) {
                $hasCover = true;
            }
        }
    }

    /**
     * Garante que o total de fotos (as que vão permanecer + as novas) não
     * ultrapasse o limite. Chamar depois do validate() e antes da transaction.
     */
    private function assertImageLimit(Product $product, array $data): void
    {
        $remaining = $product->images()
            ->whereNotIn('id', $data['removed_image_ids'] ?? [])
            ->count();

        $incoming = count($data['images'] ?? []);

        if ($remaining + $incoming > self::MAX_IMAGES) {
            abort(response()->json([
                'message' => 'Os dados enviados são inválidos.',
                'errors'  => [
                    'images' => ['O produto pode ter no máximo ' . self::MAX_IMAGES . ' fotos no total.'],
                ],
            ], 422));
        }
    }

    /**
     * Retorna dados otimizados para a página inicial (Home).
     * Evita carregar especificações, descrições longas e imagens secundárias.
     */
    public function homeData()
    {
        $products = Product::where('active', true)
            ->select('id', 'name', 'category_id')
            ->with([
                'category:id,name',
                'coverImage:id,product_id,path,is_cover',
                'variants:id,product_id,price,size,stock',
            ])
            ->latest()
            ->take(48)
            ->get()
            ->map(function ($p) {
                $path = $p->coverImage?->path ?? $p->image;
                $p->image_url = $path
                    ? (str_starts_with($path, 'http') || str_starts_with($path, '/')
                        ? $path
                        : '/storage/' . $path)
                    : null;

                return $p;
            });

        return response()->json($products);
    }

    /*--------------------------------------------
        MÉTODOS DE LISTAGEM ATUALIZADOS (FASE 2)
    --------------------------------------------*/

    // Listagem de loja pública (com busca e filtro)
    public function index(Request $request)
    {
        $query = Product::where('active', true)
            ->with(['category:id,name', 'coverImage', 'variants:id,product_id,price,size,stock']);

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('name', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%")
                    ->orWhereHas('variants', function ($v) use ($term) {
                        $v->where('barcode', 'like', "%{$term}%");
                    });
            });
        }

        // Aceita `categoria` (novo) e `category_id` (compatibilidade)
        $categoryId = $request->input('categoria') ?? $request->input('category_id');
        if ($categoryId) {
            $query->where('category_id', $categoryId);
        }

        // Novidades = produtos dos últimos 30 dias
        if ($request->boolean('novidades')) {
            $query->where('created_at', '>=', now()->subDays(30));
        }

        $perPage = min(48, max(4, (int) $request->get('per_page', 12)));

        return ProductResource::collection($query->latest()->paginate($perPage));
    }

    // Listagem do Painel Administrativo (com paginação, filtros e busca por SKU/Barcode)
    public function adminIndex(Request $request)
    {
        $query = Product::with(self::RELATIONS);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhereHas('variants', function ($v) use ($search) {
                        $v->where('barcode', 'like', "%{$search}%");
                    });
            });
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('stock_status')) {
            if ($request->stock_status === 'out_of_stock') {
                $query->whereDoesntHave('variants', function ($v) {
                    $v->where('stock', '>', 0);
                });
            } elseif ($request->stock_status === 'low_stock') {
                $query->whereHas('variants', function ($v) {
                    $v->where('stock', '>', 0)->where('stock', '<', 5);
                });
            }
        }

        $perPage = (int) $request->get('per_page', 10);
        return ProductResource::collection($query->latest()->paginate($perPage));
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

    /*--------------------------------------------
        MÉTODOS CRUD PRESERVADOS
    --------------------------------------------*/

    public function store(Request $request)
    {
        $this->authorize('create', Product::class);
        $data = $request->validate($this->rules(), $this->messages());

        $product = DB::transaction(function () use ($data, $request) {
            $product = Product::create([
                'name'        => $data['name'],
                'category_id' => $data['category_id'],
                'description' => $data['description'] ?? null,
                'image'       => $data['image'] ?? null,
                'active'      => $data['active'] ?? true,
            ]);

            $stockService = app(StockMovementService::class);

            foreach ($this->normalizeVariants($data['variants']) as $row) {
                $initialStock = $row['stock'];
                $row['stock'] = 0; // cria zerado e aplica via service, pra ficar no histórico

                $variant = $product->variants()->create($row);

                if ($initialStock > 0) {
                    $stockService->applyDelta(
                        $variant,
                        $initialStock,
                        StockMovement::TYPE_ENTRADA,
                        'Estoque inicial no cadastro do produto',
                        auth()->id()
                    );
                }
            }

            if ($specs = $this->normalizeSpecs($data['specifications'] ?? [])) {
                $product->specifications()->createMany($specs);
            }

            $this->storeImages($product, $request);

            app(AdminLogService::class)->log(
                action: 'produto.criado',
                description: "Produto \"{$product->name}\" criado.",
                subject: $product,
                newValues: $product->only(['name', 'category_id', 'description', 'active']),
            );

            return $product;
        });

        return (new ProductResource($product->load(self::RELATIONS)))
            ->additional(['message' => 'Produto criado com sucesso.'])
            ->response()
            ->setStatusCode(201);
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);
        $this->authorize('update', $product);
        $data = $request->validate($this->rules(), $this->messages());

        $this->assertImageLimit($product, $data);

        $before = $product->only(['name', 'category_id', 'description', 'active']);

        DB::transaction(function () use ($data, $product, $request, $before) {
            $product->update([
                'name'        => $data['name'],
                'category_id' => $data['category_id'],
                'description' => $data['description'] ?? null,
                'image'       => $data['image'] ?? null,
                'active'      => $data['active'] ?? $product->active,
            ]);

            /* ---- VARIAÇÕES: diff por tamanho, preserva IDs, loga alterações de estoque ---- */
            $incoming     = $this->normalizeVariants($data['variants']);
            $keptIds      = [];
            $stockService = app(StockMovementService::class);

            foreach ($incoming as $row) {
                $variant        = $product->variants()->firstOrNew(['size' => $row['size']]);
                $isNew          = !$variant->exists;
                $requestedStock = $row['stock'];

                // salva tudo, exceto o estoque em si — ele é aplicado via service pra ficar logado
                $variant->fill(array_merge($row, [
                    'stock' => $isNew ? 0 : $variant->stock,
                ]))->save();

                if ($isNew) {
                    if ($requestedStock > 0) {
                        $stockService->applyDelta(
                            $variant,
                            $requestedStock,
                            StockMovement::TYPE_ENTRADA,
                            'Estoque inicial da variação',
                            auth()->id()
                        );
                    }
                } else {
                    $stockService->setStock(
                        $variant,
                        $requestedStock,
                        'Ajuste manual via edição do produto',
                        auth()->id()
                    );
                }

                $keptIds[] = $variant->id; // ✅ corrigido (era $keptId, sem "s")
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

            /* ---- IMAGENS: remove só as marcadas, soma as novas, preserva o resto ---- */
            $removedIds = $data['removed_image_ids'] ?? [];

            if ($removedIds) {
                $product->images()
                    ->whereIn('id', $removedIds)
                    ->get()
                    ->each(function ($image) {
                        Storage::disk('public')->delete($image->path);
                        $image->delete();
                    });
            }

            $this->storeImages($product, $request);

            if (!empty($data['cover_image_id'])) {
                $product->images()->update(['is_cover' => false]);
                $product->images()->where('id', $data['cover_image_id'])->update(['is_cover' => true]);
            } elseif (!$product->images()->where('is_cover', true)->exists()) {
                // A capa foi removida e nenhuma nova foi escolhida: promove a próxima imagem restante.
                $product->images()->orderBy('sort_order')->first()?->update(['is_cover' => true]);
            }

            app(AdminLogService::class)->log(
                action: 'produto.editado',
                description: "Produto \"{$product->name}\" editado.",
                subject: $product,
                oldValues: $before,
                newValues: $product->only(['name', 'category_id', 'description', 'active']),
            );
        });

        return (new ProductResource($product->fresh()->load(self::RELATIONS)))
            ->additional(['message' => 'Produto atualizado com sucesso.']);
    }

    public function destroy($id)
    {
        $product = Product::findOrFail($id);
        $this->authorize('delete', $product);

        // soft delete: preserva as imagens em disco, permite restaurar depois
        $product->delete();

        app(AdminLogService::class)->log(
            action: 'produto.excluido',
            description: "Produto \"{$product->name}\" excluído (soft delete).",
            subject: $product,
        );

        return response()->json(['message' => 'Produto removido com sucesso.']);
    }

    public function show($id)
    {
        $product = Product::findOrFail($id);

        return view('produto', [
            'productId'       => $product->id,
            'pageTitle'       => $product->name,
            'metaDescription' => $product->description ?? 'Confira este produto em nossa loja',
            'metaImage'       => $product->image_url ?? '',
            'metaType'        => 'product',
        ]);
    }

    public function showData($id)
    {
        $product = Product::with(
            [
                'category',
                'images',
                'variants',
                'reviews' => fn($q) => $q->where('approved', true)->with(['user', 'photos']),
            ]
        )
            ->where('active', true)
            ->find($id);



        if (!$product) {
            return response()->json([
                'message' => 'Produto não encontrado.'
            ], 404);
        }

        // Preço base do produto ou o menor preço entre as variações
        $mainProductPrice = $product->price > 0
            ? $product->price
            : ($product->variants->min('price') ?? 0);

        // Busca produtos relacionados trazendo variações para cálculo de preço
        $relatedProducts = Product::with(['images', 'variants'])
            ->where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->take(4)
            ->get()
            ->map(function ($item) {
                $price = $item->price > 0
                    ? $item->price
                    : ($item->variants->min('price') ?? 0);

                return [
                    'id'        => $item->id,
                    'name'      => $item->name,
                    'price'     => (float) $price,
                    'image_url' => $item->image_url,
                ];
            });

        return response()->json([
            'id'               => $product->id,
            'name'             => $product->name,
            'description'      => $product->description,
            'price'            => (float) $mainProductPrice,
            'category'         => $product->category,
            'images'           => $product->images,
            'variants'         => $product->variants,
            'reviews'          => $product->reviews,
            'reviews_count'    => $product->reviews->count(),
            'rating_avg'       => $product->reviews->isNotEmpty()
                ? round($product->reviews->avg('rating'), 1)
                : null,
            'related_products' => $relatedProducts,
        ]);
    }

    public function adminShow($id)
    {
        // ✅ corrigido — antes o findOrFail estava sendo chamado no ProductResource,
        // que não tem esse método
        $product = Product::with(self::RELATIONS)->findOrFail($id);

        return new ProductResource($product);
    }

    public function edit($id)
    {
        Product::findOrFail($id);
        return view('admin.products', ['productId' => $id]);
    }
}
