<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // ENUM -> VARCHAR(30): status novo não exige ALTER TABLE.
            // Valores existentes são preservados.
            $table->string('status', 30)->default('pending')->change();
            $table->timestamp('delivered_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('delivered_at');
            $table->enum('status', [
                'pending', 'paid', 'shipped', 'delivered', 'canceled', 'expired', 'refunded',
            ])->default('pending')->change();
        });
    }
};
