<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Role;
use App\Models\User;

class CreateAdmin extends Controller
{
    public function create()
    {
        $roles = Role::all();

        return view('auth.create', compact('roles'));
    }

    public function index()
    {
        return view('users.index');
    }

    public function store(Request $request)
    {
        $validated  = $request->validate(
            [
                'role_id'       => 'required|exists:roles,id',
                'name'          => 'required|string|min:3|max:255',
                'email'         => 'required|email|unique:users,email',
                'username'      => 'required|string|unique:users,username',
                'password'      => 'required|confirmed|min:6|max:30'
            ],
            [
                'name.required' => 'O nome é obrigatório!',
                'name.min' => 'O nome deve conter no mínimo :min caracteres!',
                'name.max' => 'O nome deve conter no máximo :max caracteres!',
                'email.required' => 'O email é obrigatório!',
                'email.email' => 'O email deve ser válido!',
                'email.unique' => 'Não é possível cadastrar esse e-mail!',
                'username.required' => 'O campo deve ser preenchido!',
                'username.string' => 'O campo deve conter apenas letras!',
                'username.unique' => 'Não é possível cadastrar esse nome!',
                'password.required' => 'A senha é obrigatória!',
                'password.confirmed' => 'As senhas devem coincidir!',
                'password.min' => 'A senha deve conter no mínimo :min caracteres!',
                'password.max' => 'A senha deve conter no máximo :max caracteres!'
            ]
        );
        $validated['password'] = bcrypt($validated['password']);

        User::create($validated);

        return response()->json(['message' => 'Usuário criado com sucesso!'], 201);
    }

    public function data()
    {
        return response()->json(User::with('role')->get());
    }

    public function edit($id)
    {
        $roles = Role::all();
        return view('users.edit', compact('roles'))->with('userId', $id);
    }

    public function editData($id)
    {
        return response()->json(User::findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'role_id'  => 'required|exists:roles,id',
            'name'     => 'required|string|min:3|max:255',
            'email'    => 'required|email|unique:users,email,' . $id,
            'username' => 'required|string|unique:users,username,' . $id,
            'password' => 'nullable|confirmed|min:6|max:30',
        ]);

        if (empty($validated['password'])) {
            unset($validated['password']);
        } else {
            $validated['password'] = bcrypt($validated['password']);
        }

        $user->update($validated);

        return response()->json(['message' => 'Usuário atualizado com sucesso!']);
    }


    public function toggle($id)
    {
        $user = User::findOrFail($id);
        $user->active = $user->active ? 0 : 1;
        $user->save();

        return response()->json(['active' => $user->active]);
    }

    public function destroy($id)
    {
        User::findOrFail($id)->delete();
        return response()->json(['message' => 'Usuário deletado!']);
    }
}
