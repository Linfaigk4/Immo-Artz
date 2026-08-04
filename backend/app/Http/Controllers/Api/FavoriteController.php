<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Favorite;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gestion des favoris pour les utilisateurs authentifiés.
 */
class FavoriteController extends Controller
{
    /**
     * Liste des favoris de l'utilisateur connecté.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $favorites = Favorite::where('user_id', $user->id)
            ->with(['property' => function ($q) {
                $q->with('agent:id,first_name,last_name,phone,email,agency_name,rating_average');
            }])
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 12));

        return response()->json([
            'success' => true,
            'data' => [
                'favorites' => $favorites->getCollection()->map(function ($f) {
                    if (!$f->property) {
                        return null;
                    }
                    return [
                        'id' => $f->id,
                        'created_at' => $f->created_at->toIso8601String(),
                        'property' => $this->formatProperty($f->property),
                    ];
                })->filter()->values(),
                'pagination' => [
                    'current_page' => $favorites->currentPage(),
                    'last_page' => $favorites->lastPage(),
                    'per_page' => $favorites->perPage(),
                    'total' => $favorites->total(),
                ],
            ],
        ]);
    }

    /**
     * Ajouter un bien aux favoris (idempotent).
     * Accepte property_id soit en URL ({id}), soit en paramètre.
     */
    private function addFavorite(Request $request, int $propertyId): JsonResponse
    {
        $user = $request->user();

        $property = Property::find($propertyId);
        if (!$property) {
            return response()->json([
                'success' => false,
                'message' => 'Bien non trouvé.',
            ], 404);
        }

        $favorite = Favorite::firstOrCreate([
            'user_id' => $user->id,
            'property_id' => $propertyId,
        ]);

        return response()->json([
            'success' => true,
            'message' => $favorite->wasRecentlyCreated
                ? 'Bien ajouté à vos favoris.'
                : 'Ce bien est déjà dans vos favoris.',
            'data' => [
                'favorite' => [
                    'id' => $favorite->id,
                    'property_id' => $favorite->property_id,
                    'created_at' => $favorite->created_at->toIso8601String(),
                ],
            ],
        ], $favorite->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * Ajouter un bien aux favoris via route paramétrée (POST /favorites/{propertyId}).
     */
    public function store(Request $request, int $propertyId): JsonResponse
    {
        return $this->addFavorite($request, $propertyId);
    }

    /**
     * Retirer un bien des favoris.
     */
    public function destroy(Request $request, int $propertyId): JsonResponse
    {
        $user = $request->user();

        $deleted = Favorite::where('user_id', $user->id)
            ->where('property_id', $propertyId)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => $deleted ? 'Bien retiré des favoris.' : 'Ce bien n\'était pas dans vos favoris.',
            'data' => ['removed' => (bool) $deleted],
        ]);
    }

    /**
     * Vérifier si un bien est dans les favoris de l'utilisateur connecté.
     */
    public function check(Request $request, int $propertyId): JsonResponse
    {
        $user = $request->user();

        $exists = Favorite::where('user_id', $user->id)
            ->where('property_id', $propertyId)
            ->exists();

        return response()->json([
            'success' => true,
            'data' => ['is_favorite' => $exists],
        ]);
    }

    /**
     * Récupérer les IDs des biens favoris (pour synchroniser l'UI rapidement).
     */
    public function ids(Request $request): JsonResponse
    {
        $user = $request->user();
        $ids = Favorite::where('user_id', $user->id)->pluck('property_id');

        return response()->json([
            'success' => true,
            'data' => ['ids' => $ids],
        ]);
    }

    private function formatProperty(Property $p): array
    {
        return [
            'id' => $p->id,
            'title' => $p->title,
            'type' => $p->type,
            'type_label' => $p->type_label,
            'standing' => $p->standing,
            'standing_label' => $p->standing_label,
            'transaction_type' => $p->transaction_type,
            'price' => $p->price,
            'formatted_price' => $p->formatted_price,
            'currency' => $p->currency,
            'area' => $p->area,
            'bedrooms' => $p->bedrooms,
            'bathrooms' => $p->bathrooms,
            'main_image' => $p->main_image_url,
            'city' => $p->city,
            'quartier' => $p->quartier,
            'status' => $p->status,
            'is_featured' => $p->is_featured,
            'is_premium' => $p->is_premium,
            'agent' => $p->agent ? [
                'id' => $p->agent->id,
                'name' => $p->agent->full_name,
                'phone' => $p->agent->phone,
                'rating' => $p->agent->rating_average,
            ] : null,
        ];
    }

    /**
     * Ajouter un bien aux favoris depuis le body (POST /api/v1/favorites avec property_id).
     */
    public function storeFromBody(Request $request): JsonResponse
    {
        $propertyId = $request->input('property_id');
        
        if (!$propertyId) {
            return response()->json([
                'success' => false,
                'message' => 'property_id requis.',
            ], 422);
        }

        return $this->addFavorite($request, (int) $propertyId);
    }
}
