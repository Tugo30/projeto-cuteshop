<?php

namespace App\Exceptions;

use RuntimeException;

class InvalidOrderTransition extends RuntimeException
{
    public function __construct(string $from, string $to)
    {
        parent::__construct("Não é possível ir de \"{$from}\" para \"{$to}\".");
    }

    public function render($request)
    {
        if ($request->expectsJson()) {
            return response()->json(['message' => $this->getMessage()], 422);
        }

        return null;
    }
}
