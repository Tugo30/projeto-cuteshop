<?php

namespace App\Services\Correios;

use App\Models\Order;
use App\Services\OrderStatusService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CorreiosTrackingService
{
    public function __construct(
        private CorreiosCwsClient $client,
        private OrderStatusService $statuses,
    ) {}

    public function configured(): bool
    {
        return $this->client->configured();
    }

    public function syncOrder(Order $order): int
    {
        $code = strtoupper((string) preg_replace('/\s+/', '', (string) $order->tracking_code));

        if ($code === '' || ! $this->configured()) {
            return 0;
        }

        $response = $this->client->get('srorastro/v1/objetos/' . $code, [
            'resultado' => 'T',
        ]);

        if ($response->failed()) {
            Log::warning('Correios CWS rastro falhou', [
                'status'    =>  $response->status(),
                'order'     =>  $order->code,
            ]);

            return 0;
        }

        $eventos = $response->json('objetos.0.eventos');

        if (! is_array($eventos)) {
            return 0;
        }

        $eventos = collect($eventos)
            ->filter(fn($evento) => is_array($evento))
            ->sortBy(fn(array $evento) => $evento['dtHrCriado'] ?? $evento['dtHrEvento'] ?? '')
            ->values()
            ->all();

        $applied = 0;

        foreach ($eventos as $evento) {
            $eventCode = (string) ($evento['codigo'] ?? $evento['tipo'] ?? '');
            $description = (string) ($evento['descricao'] ?? $evento['detalhe'] ?? 'Evento de rastreio');
            $occurred = $evento['dtHrCriado'] ?? $evento['dtHrEvento'] ?? null;
            $reference = substr($code . '|' . ($occurred ?? '') . '|' . $eventCode, 0, 150);

            try {
                $event = $this->statuses->applyTrackingEvent(
                    order: $order->fresh(),
                    code: $eventCode,
                    description: $description,
                    payload: [
                        'unidade' => $evento['unidade'] ?? null,
                        'tipo' => $evento['tipo'] ?? null,
                    ],
                    reference: $reference,
                    occurredAt: is_string($occurred) ? Carbon::parse($occurred) : null,
                );

                if ($event) {
                    $applied++;
                }
            } catch (\Throwable $e) {
                Log::warning('Falha ao aplicar evento de rastro', ['order' => $order->code]);
            }
        }

        return $applied;
    }
}
