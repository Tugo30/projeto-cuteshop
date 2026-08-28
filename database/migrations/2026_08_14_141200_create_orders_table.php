<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();               // CS-2026-000123
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->enum('status', [
                'pending', 'paid', 'shipped', 'delivered', 'canceled', 'expired', 'refunded',
            ])->default('pending')->index();

            // valores em centavos — evita erro de float
            $table->unsignedInteger('subtotal_cents');
            $table->unsignedInteger('shipping_cents')->default(0);
            $table->unsignedInteger('discount_cents')->default(0);
            $table->unsignedInteger('total_cents');

            // snapshot do cliente (não depende do user)
            $table->string('customer_name');
            $table->string('customer_email');
            $table->string('customer_phone')->nullable();
            $table->string('customer_document')->nullable();

            // endereço
            $table->string('ship_zipcode')->nullable();
            $table->string('ship_street')->nullable();
            $table->string('ship_number')->nullable();
            $table->string('ship_complement')->nullable();
            $table->string('ship_district')->nullable();
            $table->string('ship_city')->nullable();
            $table->string('ship_state', 2)->nullable();

            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};