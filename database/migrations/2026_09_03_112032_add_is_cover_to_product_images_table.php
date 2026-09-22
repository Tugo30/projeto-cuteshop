<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            $table->boolean('is_cover')->default(false)->after('sort_order');
        });

        // Backfill: marca a primeira imagem (menor sort_order) de cada produto
        //  como capa, preservando o comportamento atual do sistema (onde a 
        // primeira imagem já era trada como principal implicitamente).
        $productIds = DB::table('product_images')->select('product_id')->distinct()->pluck('product_id');

        foreach ($productIds as $productId) {
            $firstImageId = DB::table('product_images')
                ->where('product_id', $productId)
                ->orderBy('sort_order')
                ->value('id');

            if ($firstImageId) {
                DB::table('product_images')->where('id', $firstImageId)->update(['is_cover' => true]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_images', function (Blueprint $table) {
            $table->dropColumn('is_cover');
        });
    }
};
