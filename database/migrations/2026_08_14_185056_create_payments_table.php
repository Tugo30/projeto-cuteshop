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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            $table->string('method');
            $table->string('status')->default('pending');
            $table->string('amount_cents');

            $table->string('txid')->nullable()->index();
            $table->text('pix_payload')->nullable();
            $table->text('pix_qr_base64')->nullable();

            $table->string('provider')->nullable();
            $table->string('provider_id')->nullable();
            $table->json('provider_response')->nullable();

            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
