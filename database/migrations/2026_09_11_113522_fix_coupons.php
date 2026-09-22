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
        Schema::table('coupons', function (Blueprint $table) {
            if (! Schema::hasColumn('coupons', 'user_id')) {
                $table->foreignId('user_id')
                    ->nullable()
                    ->after('active')
                    ->constrained('users')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('coupons', 'max_uses')) {
                $table->unsignedInteger('max_uses')
                    ->nullable()
                    ->after('user_id');
            }

            if (! Schema::hasColumn('coupons', 'max_uses_per_user')) {
                $table->unsignedInteger('max_uses_per_user')
                    ->default(1)
                    ->after('max_uses');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            if (Schema::hasColumn('coupons', 'user_id')) {
                $table->dropForeign(['user_id']);
            }

            $cols = array_values(array_filter(
                ['user_id', 'max_uses', 'max_uses_per_user'],
                fn(string $col) => Schema::hasColumn('coupons', $col)
            ));

            if ($cols) {
                $table->dropColumn($cols);
            }
        });
    }
};
