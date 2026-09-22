<?php

namespace App\Services\Admin;

use App\Models\AdminLog;
use Illuminate\Database\Eloquent\Model;

class AdminLogService
{
    public function log(
        string $action,
        string $description,
        ?Model $subject = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?int $userId = null
    ) : AdminLog {
        return Adminlog::create([
            'user_id'       =>  $userId ?? auth()->id(),
            'action'        =>  $action,
            'description'   =>  $description,
            'subject_type'  =>  $subject?->getMorphClass(),
            'subject_id'    =>  $subject?->getKey(),
            'old_values'    =>  $oldValues,
            'new_values'    =>  $newValues,
        ]);
    }
}