<?php
// database/migrations/2026_09_04_000001_create_admin_logs_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 50);       // ex: produto.criado, produto.excluido
            $table->string('description');      // texto pronto em português pro admin ler

            // o nullableMorphs() já cria as colunas subject_type / subject_id
            // E TAMBÉM já cria o índice 'admin_logs_subject_type_subject_id_index'
            $table->nullableMorphs('subject');

            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            $table->timestamps();

            // Índice adicional apenas para buscas por ação
            $table->index('action');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_logs');
    }
};