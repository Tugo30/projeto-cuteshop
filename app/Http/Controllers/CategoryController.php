<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index()
    {
        return response()->json(Category::orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate(
            [
                'name' => 'required|string|min:3|max:255|unique:categories,name',
            ],
            [
                'name.required' => 'O nome da categoria é obrigatório.',
                'name.unique' => 'Essa categoria já existe.'
            ]
        );

        $category = Category::create($validated);

        return response()->json($category, 201);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate(
            [
                // Adicionada a vírgula antes do $id para a regra ignore a própria categoria ao editar
                'name' => 'required|string|min:3|max:255|unique:categories,name,' . $id,
            ],
            [
                'name.required' => 'O nome da categoria é obrigatório.',
                'name.unique' => 'Essa categoria já existe.'
            ]
        );

        $category->update($validated);

        return response()->json($category);
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);
        $category->delete();

        return response()->json(['message' => 'Categoria removida com sucesso.']);
    }
}