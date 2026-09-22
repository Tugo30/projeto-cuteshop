<?php

namespace App\Services\Stock;

use App\Models\ProductVariant;
use App\Models\StockMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class StockMovementService
{
    /**
     * Aplica um delta (positivo ou negativo) ao estoque de uma variação,
     * de forma atômica (lock + transaction) e registrando o histórico.
     * Nunca deixa o estoque ficar negativo.
     */

    public function applyDelta(
        ProductVariant $variant,
        int $delta,
        string $type,
        ?string $reason = null,
        ?int $userId = null,
        $reference = null
    ): StockMovement {
        if (!in_array($type, StockMovement::TYPES, true)) {
            throw new RuntimeException("Tipo de movimentação inválido: {$type}");
        }

        return DB::transaction(function () use ($variant, $delta, $type, $reason, $userId, $reference) {
            $locked = ProductVariant::where('id', $variant->id)->lockForUpdate()->first();

            $before = $locked->stock;
            $after  = $before + $delta;

            $locked->update(['stock' => $after]);

            // Estoque negativo não é bloqueado, mas fica registrado pra investigação
            if ($after < 0) {
                Log::channel('stock')->warning('Estoque negativo detectado', [
                    'variant_id'   => $locked->id,
                    'product_id'   => $locked->product_id,
                    'stock_before' => $before,
                    'stock_after'  => $after,
                    'type'         => $type,
                    'user_id'      => $userId,
                ]);
            }

            return StockMovement::create([
                'product_id'         => $locked->product_id,
                'product_variant_id' => $locked->id,
                'type'               => $type,
                'quantity'           => $delta,
                'stock_before'       => $before,
                'stock_after'        => $after,
                'reason'             => $reason,
                'user_id'            => $userId,
                'reference_type'     => $reference?->getMorphClass(),
                'reference_id'       => $reference?->getKey(),
            ]);
        });
    }

    /**
     * Define o estoque para um valor absoluto (usado no ajuste manual pelo admin).
     * Retorna null se o valor não mudou (evita gerar registro de histórico à toca).
     */

    public function setStock(
        ProductVariant $variant,
        int $newStock,
        ?string $reason = null,
        ?int $userId = null
    ): ?StockMovement {
        $delta = $newStock - $variant->stock;

        if ($delta === 0) {
            return null;
        }

        return $this->applyDelta($variant, $delta, StockMovement::TYPE_AJUSTE, $reason, $userId);
    }
}
