<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_status_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();

            $table->string('status', 30);                 // status de negócio no momento
            $table->string('stage', 30)->nullable();      // passo da barra (progress)
            $table->string('label', 120);                 // texto exibido na timeline
            $table->string('source', 20)->default('sistema'); // admin|correios|sistema|cliente
            $table->text('description')->nullable();
            $table->json('payload')->nullable();
            $table->string('reference', 150)->nullable(); // idempotência (ex: codigo|data do evento)
            $table->timestamp('occurred_at');

            $table->timestamps();

            $table->index(['order_id', 'occurred_at']);
            $table->unique(['order_id', 'reference']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_status_events');
    }
};
