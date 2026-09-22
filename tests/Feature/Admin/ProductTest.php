<?php

use App\Models\User;
use App\Models\Role;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    $adminRole = Role::factory()->create(['nome' => 'admin']);
    $this->user = User::factory()->create(['role_id' => $adminRole->id]);

    $this->actingAs($this->user);
});

test('pode listar produtos paginados', function () {
    Product::factory()->hasVariants(1)->count(15)->create();

    $response = $this->getJson('/api/admin/produtos');

    $response->assertStatus(200)
        ->assertJsonStructure(['data', 'links']);
});

test('valida campos obrigatorios ao criar produto', function () {
    $response = $this->postJson('/api/admin/products', [
        'name' => '',
        'category_id' => null,
    ]);

    $response->assertStatus(422)
        ->assertJsonValidationErrors(['name', 'category_id']);
});

test('cria produto valido com sucesso', function () {
    $category = Category::factory()->create();

    $payload = [
        'name' => 'Camiseta Estampada',
        'category_id' => $category->id,
        'description' => 'Descrição do produto',
        'variants' => [
            [
                'size' => 'M',
                'barcode' => '9200000001465',
                'cost_price' => 20.00,
                'price' => 50.00,
                'stock' => 10,
            ]
        ]
    ];

    $response = $this->postJson('/api/admin/products', $payload);

    $response->assertStatus(201);
    $this->assertDatabaseHas('products', ['name' => 'Camiseta Estampada']);
    $this->assertDatabaseHas('product_variants', ['barcode' => '9200000001465']);
});

test('permite cadastrar variacao com estoque negativo para inventario', function () {
    $category = Category::factory()->create();

    $payload = [
        'name' => 'Produto Estoque Negativo',
        'category_id' => $category->id,
        'variants' => [
            [
                'barcode' => '9200000001569',
                'price' => 50,
                'stock' => -5,
            ]
        ]
    ];

    $response = $this->postJson('/api/admin/products', $payload);

    // Valida que a API recusa estoque negativo com erro 422
    $response->assertStatus(422)
        ->assertJsonValidationErrors(['variants.0.stock']);
});

test('permite upload de imagem de produto em disco temporario', function () {
    Storage::fake('public');
    $category = Category::factory()->create();
    $file = UploadedFile::fake()->create('produto.jpg', 100, 'image/jpeg');

    $payload = [
        'name' => 'Produto com Capa',
        'category_id' => $category->id,
        'variants' => [
            ['size' => 'P', 'price' => 40.00, 'stock' => 2]
        ],
        'images' => [$file]
    ];

    $response = $this->postJson('/api/admin/products', $payload);

    $response->assertStatus(201);
});
