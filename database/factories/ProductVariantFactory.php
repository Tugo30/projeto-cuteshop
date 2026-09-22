<?php

namespace Database\Factories;

use App\Models\ProductVariant;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ProductVariant>
 */
class ProductVariantFactory extends Factory
{
    protected $model = ProductVariant::class;

    public function definition(): array
    {
        return [
            'product_id'  => Product::factory(),
            'size'        => $this->faker->randomElement(['P', 'M', 'G']),
            'barcode'     => strtoupper($this->faker->unique()->bothify('###########')), // ✅ era 'sku'
            'cost_price'  => 50.00,
            'price'       => 100.00,
            'stock'       => 10,
        ];
    }
}