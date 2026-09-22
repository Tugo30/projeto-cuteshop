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
        Schema::table('product_variants', function (Blueprint $table) {
            $table->decimal('weight_kg', 6, 3)->default(0.300);
            $table->unsignedSmallInteger('height_cm')->default(10);
            $table->unsignedSmallInteger('width_cm')->default(15);
            $table->unsignedSmallInteger('length_cm')->default(20);

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
          Schema::table('product_variants', function (Blueprint $table) {
                    $table->dropColumn(['weight_kg', 'height_cm', 'width_cm', 'length_cm']);
        });
    }
};
