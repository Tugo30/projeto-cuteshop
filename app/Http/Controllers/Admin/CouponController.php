<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CouponController extends Controller
{
    public function page()
    {
        return view('admin.coupons');
    }

    public function index(Request $request)
    {
        $this->authorize('viewAny', Coupon::class);

        $query = Coupon::query()->with('owner:id,username,email')->latest();

        if ($request->filled('search')) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('codigo', 'like', "%{$term}%")
                    ->orWhereHas('owner', fn($o) => $o->where('username', 'like', "%{$term}%"));
            });
        }

        return response()->json(
            $query->get()->map(fn(Coupon $c) => $this->present($c))->values()
        );
    }

    public function show(Coupon $coupon)
    {
        $this->authorize('viewAny', Coupon::class);

        $coupon->load('owner:id,username,email');

        $usos = $coupon->usageQuery()
            ->with('user:id,username,email')
            ->latest()
            ->get()
            ->map(fn($o) => [
                'code'           => $o->code,
                'status'         => $o->status,
                'customer_name'  => $o->customer_name,
                'customer_email' => $o->customer_email,
                'username'       => $o->user?->username,
                'total'          => $o->total_cents / 100,
                'discount'       => $o->discount_cents / 100,
                'created_at'     => $o->created_at,
            ]);

        return response()->json($this->present($coupon, $usos));
    }

    public function store(Request $request)
    {
        $this->authorize('create', Coupon::class);

        $data = $this->validated($request);
        $data['codigo'] = strtoupper($data['codigo']);

        $coupon = Coupon::create($data);

        return response()->json($this->present($coupon->load('owner:id,username,email')), 201);
    }

    public function update(Request $request, Coupon $coupon)
    {
        $this->authorize('update', $coupon);

        $data = $this->validated($request, $coupon->id);
        $data['codigo'] = strtoupper($data['codigo']);

        $coupon->update($data);

        return response()->json($this->present($coupon->fresh()->load('owner:id,username,email')));
    }

    public function destroy(Coupon $coupon)
    {
        $this->authorize('delete', $coupon);

        if ($coupon->orders()->exists()) {
            return response()->json(['message' => 'Cupom já usado em pedidos. Desative em vez de apagar.'], 422);
        }

        $coupon->delete();

        return response()->json(['message' => 'Cupom removido.']);
    }

    public function searchUsers(Request $request)
    {
        $this->authorize('create', Coupon::class);

        $q = trim((string) $request->get('q', ''));
        if (strlen($q) < 2) {
            return response()->json([]);
        }

        return User::query()
            ->where(function ($query) use ($q) {
                $query->where('username', 'like', "%{$q}%")
                    ->orWhere('email', 'like', "%{$q}%");
            })
            ->orderBy('username')
            ->limit(15)
            ->get(['id', 'username', 'email']);
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $unique = Rule::unique('coupons', 'codigo');
        if ($ignoreId) {
            $unique = $unique->ignore($ignoreId);
        }

        return $request->validate([
            'codigo'             => ['required', 'string', 'min:3', 'max:30', $unique],
            'tipo'               => ['required', Rule::in(['percentual', 'fixo'])],
            'valor' => [
                'required',
                'numeric',
                'min:0.01',
                Rule::when($request->input('tipo') === 'percentual', ['max:100']),
            ],
            'validade'           => ['nullable', 'date'],
            'active'             => ['sometimes', 'boolean'],
            'user_id'            => ['nullable', 'integer', 'exists:users,id'],
            'max_uses'           => ['nullable', 'integer', 'min:1'],
            'max_uses_per_user'  => ['required', 'integer', 'min:1', 'max:50'],
        ]);
    }

    private function present(Coupon $c, $usos = null): array
    {
        $used = $c->usageQuery()->count();

        $base = [
            'id'                => $c->id,
            'codigo'            => $c->codigo,
            'tipo'              => $c->tipo,
            'valor'             => $c->valor,
            'validade'          => $c->validade?->toDateString(),
            'active'            => $c->active,
            'user_id'           => $c->user_id,
            'owner'             => $c->owner ? [
                'id'       => $c->owner->id,
                'username' => $c->owner->username,
                'email'    => $c->owner->email,
            ] : null,
            'max_uses'          => $c->max_uses,
            'max_uses_per_user' => $c->max_uses_per_user,
            'used_count'        => $used,
        ];

        if ($usos === null) {
            return $base;
        }

        $base['usos'] = $usos;

        return $base;
    }
}
