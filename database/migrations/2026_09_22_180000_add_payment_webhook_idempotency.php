<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('provider')->default('getnet');
            $table->string('fingerprint')->unique();
            $table->string('provider_payment_id')->nullable()->index();
            $table->string('order_code')->nullable()->index();
            $table->string('mapped_status')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->string('provider_status')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table) {
            $table->dropColumn('provider_status');
        });

        Schema::dropIfExists('webhook_events');
    }
};
