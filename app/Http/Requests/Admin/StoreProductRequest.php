<?php 

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize() : bool
    {
        return true;
    }

    public function rules() : array
    {
        return [
            'name'                      =>  'required|string|max:255',
            'category_id'               =>  'required|exists:categories,id',
            'description'               =>  'nullable|string|max:500',
            'active'                    =>  'boolean',
            'variants'                  =>  'required|array|min:1',
            'variants.*.size'           =>  'required|string|max:50',
            'variants.*.stock'          =>  'required|integer|min:0',
            'variants.*.cost_price'     =>  'nullable|numeric|min:0',
            'variants.*.sku'            =>  'nullable|string|max:100|distinct',
            'variants.*.barcode'        =>  'nullable|string|max:100|distinc',
            'specifications'            =>  'nullable|array',
            'specifications.*.name'     =>  'required|string|max:100',
            'specifications.*.value'    =>  'required|string|max:255',
            'images'                    =>  'nullable|array|max:6',
            'images.*'                  =>  'image|mimes:jpeg,jpg,png,webp|max:4096'
        ];
    }

    public function messages() : array
    {
        return [
            'name.required'                 =>  'O nome do produto é obrigatório.',
            'category_id.required'          =>  'Selecione uma categoria válida.',
            'category_id.exists'            =>  'A categoria selecionada não foi encontrada.',
            'variants.required'             =>  'Cadastre ao menos uma variação (ex: Tamanho/Cor).',
            'variants.min'                  =>  'Cadastre ao menos uma variação',
            'variants.*.required'           =>  'O tamanho da variação é obrigatório.',
            'variants.*.stock.min'          =>  'O estoque não pode ser negativo.',
            'variants.*.price.gt'           =>  'O preço de venda deve ser maior que zero.',
            'variants.*.sku.distinct'       =>  'Existem SKUs duplicados nas variações.',
            'variants.*.barcode.distinct'   =>  'Existem códigos de barras duplicados nas variações.',
            'images.max'                    =>  'Você pode enviar no máximo 6 imagens.',
            'images.*.image'                =>  'O arquivo selecionado dever uma imagem.',
            'imagem.*.mimes'                =>  'Formato de imagem inválido. Use JPG, PNG, WEBP.',
            'images.*.max'                  => 'O tamanho máximo por imagem é 4MB.'

        ];
    }
}