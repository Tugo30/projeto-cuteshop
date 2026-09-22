<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();

            $table->foreignId('product_id')
                ->constrained()
                ->cascadeOnDelete();

            

            // nullable + nullOnDelete: se a variação for removida, o histórico
            // continua existindo (mesmo padrão já usado em order_items)
            $table->foreignId('product_variant_id')
                ->nullable()
                ->constrained('product_variants')
                ->nullOndDelete();

            $table->string('type', 20); //entrada, saída, ajuse, venda, cancelamento, devolucao
            $table->integer('quantity');
            $table->integer('stock_before');
            $table->integer('stock_after');
            $table->string('reason')->nullable();

            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            // referência opcional (ex: um Order, um Payment) que originou a movimentação
            $table->nullableMorphs('reference');

            $table->timestamps();

            $table->index(['product_variant_id', 'created_at']);
            $table->index('type');
            
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
    }
};
