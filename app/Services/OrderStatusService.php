<?php

namespace App\Services;

use App\Events\OrderStatusChanged;
use App\Exceptions\InvalidOrderTransition;
use App\Models\Order;
use App\Models\OrderStatusEvent;
use Illuminate\Support\Facades\DB;

class OrderStatusService
{
    public const LABELS = [
        'pending'   => 'Aguardando pagamento',
        'paid'      => 'Pagamento aprovado',
        'preparing' => 'Em separação',
        'shipped'   => 'Enviado',
        'delivered' => 'Entregue',
        'canceled'  => 'Cancelado',
        'expired'   => 'Expirado',
        'refunded'  => 'Reembolsado',
    ];

    public const STAGES = [
        'received'   => 'Recebido',
        'preparing'  => 'Em Separação',
        'ready'      => 'Pronto para Coleta',
        'in_transit' => 'Em Trânsito',
        'out'        => 'Saiu para Entrega',
        'delivered'  => 'Entregue',
    ];

    private const STAGE_FOR_STATUS = [
        'pending'   => 'received',
        'paid'      => 'received',
        'preparing' => 'preparing',
        'shipped'   => 'in_transit',
        'delivered' => 'delivered',
    ];

    public const TRANSITIONS = [
        'pending'   => ['paid', 'canceled', 'expired'],
        'paid'      => ['preparing', 'shipped', 'canceled', 'refunded'],
        'preparing' => ['shipped', 'canceled', 'refunded'],
        'shipped'   => ['delivered', 'canceled'],
        'delivered' => ['refunded'],
        'canceled'  => [],
        'expired'   => ['paid'],
        'refunded'  => [],
    ];

    private const TIMESTAMP_FOR = [
        'paid'      => 'paid_at',
        'shipped'   => 'shipped_at',
        'delivered' => 'delivered_at',
    ];

    public const TRACKING_EVENTS = [
        'PO'  => ['label' => 'Objeto postado',         'stage' => 'in_transit', 'status' => 'shipped'],
        'RO'  => ['label' => 'Objeto recebido',        'stage' => 'in_transit', 'status' => null],
        'OEC' => ['label' => 'Em trânsito',            'stage' => 'in_transit', 'status' => null],
        'DO'  => ['label' => 'Saiu para entrega',      'stage' => 'out',        'status' => null],
        'TR'  => ['label' => 'Tentativa de entrega',   'stage' => 'out',        'status' => null],
        'BDR' => ['label' => 'Aguardando retirada',    'stage' => 'out',        'status' => null],
        'BDE' => ['label' => 'Entregue',               'stage' => 'delivered',  'status' => 'delivered'],
        'REV' => ['label' => 'Devolvido ao remetente', 'stage' => null,         'status' => null],
    ];

    public function transition(
        Order $order,
        string $to,
        string $source = 'sistema',
        ?string $description = null,
        array $payload = [],
        bool $force = false,
        ?string $stage = null,
        ?string $label = null,
    ): OrderStatusEvent {
        $from = $order->status;

        if (! $force && $from !== $to && ! $this->canTransition($from, $to)) {
            throw new InvalidOrderTransition($from, $to);
        }

        return DB::transaction(function () use ($order, $from, $to, $source, $description, $payload, $stage, $label) {
            if ($from !== $to) {
                $attributes = ['status' => $to];

                if ($column = self::TIMESTAMP_FOR[$to] ?? null) {
                    $attributes[$column] = $order->{$column} ?? now();
                }

                $order->update($attributes);
            }

            return $this->record(
                order: $order,
                status: $to,
                source: $source,
                description: $description,
                payload: $payload,
                stage: $stage,
                label: $label,
            );
        });
    }

    public function record(
        Order $order,
        string $status,
        string $source = 'sistema',
        ?string $description = null,
        array $payload = [],
        ?string $stage = null,
        ?string $label = null,
        ?string $reference = null,
        ?\DateTimeInterface $occurredAt = null,
    ): OrderStatusEvent {
        $event = $order->statusEvents()->create([
            'status'      => $status,
            'stage'       => $stage ?? self::STAGE_FOR_STATUS[$status] ?? null,
            'label'       => $label ?? self::LABELS[$status] ?? $status,
            'source'      => $source,
            'description' => $description,
            'payload'     => $payload ?: null,
            'reference'   => $reference,
            'occurred_at' => $occurredAt ?? now(),
        ]);

        OrderStatusChanged::dispatch($order, $event);

        return $event;
    }

    public function canTransition(string $from, string $to): bool
    {
        return in_array($to, self::TRANSITIONS[$from] ?? [], true);
    }

    public function applyTrackingEvent(
        Order $order,
        string $code,
        string $description,
        array $payload = [],
        ?string $reference = null,
        ?\DateTimeInterface $occurredAt = null,
    ): ?OrderStatusEvent {
        $reference ??= $code;

        if ($order->statusEvents()->where('reference', $reference)->exists()) {
            return null;
        }

        $map = self::TRACKING_EVENTS[$code] ?? null;

        if (! $map) {
            return $this->record(
                $order,
                $order->status,
                'correios',
                $description,
                $payload,
                reference: $reference,
                occurredAt: $occurredAt,
            );
        }

        return DB::transaction(function () use ($order, $map, $description, $payload, $reference, $occurredAt) {
            $target = $map['status'] ?? $order->status;

            if ($target !== $order->status && $this->canTransition($order->status, $target)) {
                $attributes = ['status' => $target];

                if ($column = self::TIMESTAMP_FOR[$target] ?? null) {
                    $attributes[$column] = $occurredAt ?? now();
                }

                $order->update($attributes);
            }

            $order->refresh();

            return $this->record(
                order: $order,
                status: $order->status,
                source: 'correios',
                description: $description,
                payload: $payload,
                stage: $map['stage'],
                label: $map['label'],
                reference: $reference,
                occurredAt: $occurredAt,
            );
        });
    }

    public function progress(Order $order): array
    {
        $order->loadMissing('statusEvents');

        $events = $order->statusEvents->sortBy('occurred_at');
        $reached = [];

        foreach ($events as $event) {
            if ($event->stage) {
                $reached[$event->stage] = $event->occurred_at;
            }
        }

        if ($stage = self::STAGE_FOR_STATUS[$order->status] ?? null) {
            $reached[$stage] ??= $order->updated_at;
        }

        $keys = array_keys(self::STAGES);
        $furthest = 0;

        foreach ($keys as $index => $key) {
            if (isset($reached[$key]) && $index > $furthest) {
                $furthest = $index;
            }
        }

        $steps = [];

        foreach ($keys as $index => $key) {
            $steps[] = [
                'key'   => $key,
                'label' => self::STAGES[$key],
                'state' => $index < $furthest ? 'done' : ($index === $furthest ? 'current' : 'pending'),
                'at'    => isset($reached[$key]) ? $reached[$key]->toIso8601String() : null,
            ];
        }

        return [
            'steps'     => $steps,
            'finished'  => $order->status === 'delivered',
            'cancelled' => in_array($order->status, ['canceled', 'expired', 'refunded'], true),
            'history'   => $events->values()->map(fn (OrderStatusEvent $e) => [
                'status'      => $e->status,
                'stage'       => $e->stage,
                'label'       => $e->label,
                'source'      => $e->source,
                'description' => $e->description,
                'occurred_at' => $e->occurred_at->toIso8601String(),
            ])->all(),
        ];
    }
}
