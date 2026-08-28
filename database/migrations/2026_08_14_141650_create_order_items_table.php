<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            // 👇 nullable + nullOnDelete: variante pode sumir, pedido NUNCA
            $table->foreignId('product_variant_id')->nullable()
                  ->constrained('product_variants')->nullOnDelete();
            $table->foreignId('product_id')->nullable()
                  ->constrained('products')->nullOnDelete();

            // SNAPSHOT — imutável
            $table->string('product_name');
            $table->string('variant_size');
            $table->string('product_image')->nullable();
            $table->unsignedInteger('unit_price_cents');
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('total_cents');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};