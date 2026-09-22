<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name'        => $this->faker->words(3, true),
            'category_id' => Category::factory(),
            'description' => $this->faker->optional()->paragraph(),
            'image'       => null,
            'active'      => true,
        ];
    }
}