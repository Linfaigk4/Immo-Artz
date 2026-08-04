<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminController extends Controller
{
    /**
     * Liste tous les biens (Admin)
     */
    public function properties(Request $request): JsonResponse
    {
        $query = Property::with('agent:id,first_name,last_name,email')
            ->orderByDesc('created_at');

        // Filtres
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('is_featured')) {
            $query->where('is_featured', $request->boolean('is_featured'));
        }
        if ($request->has('standing')) {
            $query->where('standing', $request->standing);
        }

        $properties = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => [
                'properties' => $properties->map(fn($p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                    'type' => $p->type_label,
                    'standing' => $p->standing_label,
                    'price' => $p->formatted_price,
                    'status' => $p->status,
                    'is_featured' => $p->is_featured,
                    'is_premium' => $p->is_premium,
                    'view_count' => $p->view_count,
                    'created_at' => $p->created_at->toIso8601String(),
                    'agent' => $p->agent?->full_name,
                ]),
                'pagination' => [
                    'current_page' => $properties->currentPage(),
                    'last_page' => $properties->lastPage(),
                    'per_page' => $properties->perPage(),
                    'total' => $properties->total(),
                ],
            ],
        ]);
    }

    /**
     * Mettre en vedette / Retirer de la vedette
     */
    public function toggleFeatured(Request $request, int $id): JsonResponse
    {
        $property = Property::find($id);

        if (!$property) {
            return response()->json([
                'success' => false,
                'message' => 'Bien non trouvé.',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'is_featured' => ['required', 'boolean'],
            'featured_until' => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $property->update([
            'is_featured' => $request->boolean('is_featured'),
            'featured_until' => $request->input('featured_until'),
        ]);

        return response()->json([
            'success' => true,
            'message' => $property->is_featured 
                ? 'Bien mis en vedette avec succès.' 
                : 'Bien retiré de la vedette.',
            'data' => [
                'property' => [
                    'id' => $property->id,
                    'title' => $property->title,
                    'is_featured' => $property->is_featured,
                    'featured_until' => $property->featured_until?->toIso8601String(),
                ],
            ],
        ]);
    }

    /**
     * Définir l'ordre d'affichage des biens en vedette
     */
    public function setFeaturedOrder(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'properties' => ['required', 'array'],
            'properties.*.id' => ['required', 'exists:properties,id'],
            'properties.*.order' => ['required', 'integer', 'min:0'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        foreach ($request->input('properties') as $item) {
            Property::where('id', $item['id'])->update([
                'featured_order' => $item['order'],
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Ordre mis à jour avec succès.',
        ]);
    }

    /**
     * Liste des biens en vedette avec statistiques
     */
    public function featuredProperties(Request $request): JsonResponse
    {
        $properties = Property::featured()
            ->with('agent:id,first_name,last_name')
            ->orderBy('featured_order')
            ->orderByDesc('created_at')
            ->get();

        $stats = [
            'total_featured' => $properties->count(),
            'total_views' => $properties->sum('view_count'),
            'total_contacts' => $properties->sum('contact_count'),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'stats' => $stats,
                'properties' => $properties->map(fn($p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                    'main_image' => $p->main_image_url,
                    'price' => $p->formatted_price,
                    'city' => $p->city,
                    'view_count' => $p->view_count,
                    'contact_count' => $p->contact_count,
                    'featured_order' => $p->featured_order,
                    'featured_until' => $p->featured_until?->toIso8601String(),
                    'agent' => $p->agent?->full_name,
                ]),
            ],
        ]);
    }

    /**
     * Statistiques globales du dashboard admin
     */
    public function dashboardStats(): JsonResponse
    {
        $stats = [
            'users' => [
                'total' => \App\Models\User::count(),
                'agents' => \App\Models\User::agents()->count(),
                'visitors' => \App\Models\User::where('role', 'visitor')->count(),
                'new_this_month' => \App\Models\User::whereMonth('created_at', now()->month)->count(),
            ],
            'properties' => [
                'total' => Property::count(),
                'published' => Property::published()->count(),
                'featured' => Property::featured()->count(),
                'sold' => Property::where('status', 'sold')->count(),
                'rented' => Property::where('status', 'rented')->count(),
            ],
            'views' => [
                'total' => \App\Models\PropertyView::count(),
                'today' => \App\Models\PropertyView::today()->count(),
                'this_week' => \App\Models\PropertyView::thisWeek()->count(),
                'this_month' => \App\Models\PropertyView::thisMonth()->count(),
            ],
            'catalog' => [
                'total_accesses' => \App\Models\CatalogAccessLog::count(),
                'accesses_today' => \App\Models\CatalogAccessLog::whereDate('accessed_at', today())->count(),
                'current_password_uses' => \App\Models\CatalogPassword::getCurrentValid()?->current_uses ?? 0,
            ],
            'revenue' => [
                'total' => \App\Models\Payment::completed()->sum('amount'),
                'this_month' => \App\Models\Payment::completed()
                    ->whereMonth('paid_at', now()->month)
                    ->sum('amount'),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}

    /**
     * Liste tous les utilisateurs (Admin)
     */
    public function users(Request $request): JsonResponse
    {
        $query = \App\Models\User::query();

        // Filtres
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $users = $query->orderByDesc('created_at')
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => [
                'users' => $users->map(fn($u) => [
                    'id' => $u->id,
                    'full_name' => $u->full_name,
                    'email' => $u->email,
                    'phone' => $u->phone,
                    'role' => $u->role,
                    'status' => $u->status,
                    'agency_name' => $u->agency_name,
                    'license_number' => $u->license_number,
                    'rating_average' => $u->rating_average,
                    'rating_count' => $u->rating_count,
                    'created_at' => $u->created_at->toIso8601String(),
                ]),
                'pagination' => [
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                    'per_page' => $users->perPage(),
                    'total' => $users->total(),
                ],
            ],
        ]);
    }

    /**
     * Activer un utilisateur
     */
    public function activateUser(int $id): JsonResponse
    {
        $user = \App\Models\User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non trouvé.',
            ], 404);
        }

        $user->update(['status' => 'active']);

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur activé avec succès.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'full_name' => $user->full_name,
                    'status' => $user->status,
                ],
            ],
        ]);
    }

    /**
     * Désactiver un utilisateur
     */
    public function deactivateUser(int $id): JsonResponse
    {
        $user = \App\Models\User::find($id);

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Utilisateur non trouvé.',
            ], 404);
        }

        $user->update(['status' => 'inactive']);

        return response()->json([
            'success' => true,
            'message' => 'Utilisateur désactivé avec succès.',
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'full_name' => $user->full_name,
                    'status' => $user->status,
                ],
            ],
        ]);
    }
}
