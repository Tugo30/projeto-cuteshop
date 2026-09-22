<?php

namespace App\Services\Correios;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class CorreiosCwsClient
{
    private const TOKEN_CACHE = 'correios.cws.token';

    public function configured(): bool
    {
        return $this->credential('services.correios.user') !== ''
            && $this->credential('services.correios.api_token') !==  ''
            && $this->credential('services.correios.contrato') !== ''
            && $this->credential('services.correios.cartao_postagem') !== '';
    }

    public function credential(string $key)
    {
        $value = trim((string) config($key));

        if ($value == '' || preg_match('/^(SEU_|CODIGO_)/', $value) === 1) {
            return '';
        }

        return $value;
    }

    public function get(string $path, array $query = []): Response
    {
        return $this->send('GET', $path, ['query' => $query]);
    }

    public function post(string $path, array $body = []): Response
    {
        return $this->send('POST', $path, ['json' => $body]);
    }

    public function send(string $method, string $path, array $options, bool $retry = true): Response
    {
        $response = Http::withToken($this->token())
            ->acceptJson()
            ->asJson()
            ->timeout(30)
            ->send($method, $this->url($path), $options);

        if ($response->status() === 401 && $retry) {
            // Token pode ter expirado entre o cache e a chamada — limpa e
            // tenta de novo com um token novo, só uma vez (retry: false
            // evita loop infinito se o 401 for por outro motivo, ex:
            // credencial revogada).
            Cache::forget(self::TOKEN_CACHE);

            return $this->send($method, $path, $options, retry: false);
        }

        return $response;
    }

    public function token(): string
    {
        $cached = Cache::get(self::TOKEN_CACHE);

        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        if(! $this->configured()) {
            throw new RuntimeException('Correios CWS não configurado.');
        }

        $user = $this->credential('services.correios.user');
        $apiToken = $this->credential('services.correios.api_token');
        $cartao = $this->credential('services.correios.cartao_postagem');

        $response = Http::withBasicAuth($user, $apiToken)
            ->acceptJson()
            ->asJson()
            ->timeout(20)
            ->post($this->url('/token/v1/autentica/cartaopostagem'), [
                'numero' => $cartao,
            ]);
        if($response->failed() || ! filled($response->json('token'))){
            Log::warning('Correios CWS falhou', ['status' => $response->status()]);

            throw new RuntimeException('Não foi possível autenticar no Coreios CWS.');
        }

        $token = (string) $response->json('token');
        $ttl =  50 * 60;

        try {
            $expires = $response->json('expiraEm');
            if(is_string($expires) && $expires !== '') {
                $seconds = now()->diffinSeconds(Carbon::parse($expires), false);
                if($seconds > 60) {
                    $ttl = max(60, $seconds - 60);
                }
            }
        } catch (\Throwable) {
        }

        Cache::put(self::TOKEN_CACHE, $token, $ttl);
        return $token;
    }

    private function url(string $path): string
    {
        $root = config('services.correios.sandbox', true)
            ? 'https://apihom.correios.com.br'
            : 'https://api.correios.com.br';

            return rtrim($root, '/'). '/'. ltrim($path, '/');
    }
}