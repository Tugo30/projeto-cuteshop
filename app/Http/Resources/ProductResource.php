<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                =>  $this->id,
            'name'              =>  $this->name,
            'description'       =>  $this->description,
            'active'            =>  (bool) $this->active,
            'category_id'       =>  $this->category_id,
            'category'          =>  $this->category,
            'variants'          =>  $this->variants,
            'specifications'    =>  $this->whenLoaded('specifications'),
            'images'            =>  $this->images,
            'created_at'        =>  $this->created_at,
            'updated_at'        =>  $this->updated_at,
        ];
    }
}
