<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ContactRequest;
use App\Models\Property;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

/**
 * Gestion des demandes de contact entre visiteurs et agents.
 */
class ContactRequestController extends Controller
{
    /**
     * Soumettre une demande de contact pour un bien (logique partagée).
     */
    private function submitContactRequest(Request $request, int $propertyId): JsonResponse
    {
        $property = Property::with('agent')->find($propertyId);

        if (!$property) {
            return response()->json([
                'success' => false,
                'message' => 'Bien non trouvé.',
            ], 404);
        }

        if (!$property->agent) {
            return response()->json([
                'success' => false,
                'message' => 'Agent introuvable pour ce bien.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:160'],
            'phone' => ['nullable', 'string', 'max:32'],
            'message' => ['required', 'string', 'min:10', 'max:2000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Anti-spam léger : max 3 demandes par IP / 1 heure / même bien
        $recent = ContactRequest::where('property_id', $propertyId)
            ->where('ip_address', $request->ip())
            ->where('created_at', '>=', now()->subHour())
            ->count();

        if ($recent >= 3) {
            return response()->json([
                'success' => false,
                'message' => 'Trop de demandes envoyées récemment. Réessayez dans 1 heure.',
                'error_code' => 'RATE_LIMITED',
            ], 429);
        }

        $contact = ContactRequest::create([
            'property_id' => $propertyId,
            'agent_id' => $property->agent_id,
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone,
            'message' => $request->message,
            'status' => 'new',
            'ip_address' => $request->ip(),
        ]);

        $property->incrementContactCount();

        // Notification email à l'agent (non bloquante)
        try {
            if (config('mail.default') && $property->agent->email) {
                Mail::raw(
                    "Nouvelle demande de contact pour : {$property->title}\n\n" .
                    "De : {$contact->name} ({$contact->email})\n" .
                    "Téléphone : " . ($contact->phone ?: 'non renseigné') . "\n\n" .
                    "Message :\n{$contact->message}\n\n" .
                    "Plateforme IMMO",
                    function ($m) use ($property, $contact) {
                        $m->to($property->agent->email)
                          ->subject("[IMMO] Nouveau contact — {$property->title}")
                          ->replyTo($contact->email, $contact->name);
                    }
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Échec envoi email contact agent', ['error' => $e->getMessage()]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Votre demande a été envoyée à l\'agent. Il vous recontactera rapidement.',
            'data' => [
                'contact_request' => [
                    'id' => $contact->id,
                    'status' => $contact->status,
                    'created_at' => $contact->created_at->toIso8601String(),
                ],
            ],
        ], 201);
    }

    /**
     * Soumettre une demande de contact pour un bien (route paramétrée).
     */
    public function store(Request $request, int $propertyId): JsonResponse
    {
        return $this->submitContactRequest($request, $propertyId);
    }

    /**
     * Liste des demandes de contact de l'agent connecté (ou tout si admin).
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = ContactRequest::with([
            'property:id,title,main_image,city,quartier',
            'agent:id,first_name,last_name',
        ])->orderByDesc('created_at');

        if (!$user->isAdmin()) {
            $query->where('agent_id', $user->id);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $contacts = $query->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => [
                'contacts' => $contacts->getCollection()->map(fn($c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'email' => $c->email,
                    'phone' => $c->phone,
                    'message' => $c->message,
                    'status' => $c->status,
                    'created_at' => $c->created_at->toIso8601String(),
                    'property' => $c->property ? [
                        'id' => $c->property->id,
                        'title' => $c->property->title,
                        'main_image' => $c->property->main_image,
                        'city' => $c->property->city,
                        'quartier' => $c->property->quartier,
                    ] : null,
                    'agent' => $c->agent ? [
                        'id' => $c->agent->id,
                        'name' => $c->agent->full_name ?? trim(($c->agent->first_name ?? '') . ' ' . ($c->agent->last_name ?? '')),
                    ] : null,
                ]),
                'pagination' => [
                    'current_page' => $contacts->currentPage(),
                    'last_page' => $contacts->lastPage(),
                    'per_page' => $contacts->perPage(),
                    'total' => $contacts->total(),
                ],
            ],
        ]);
    }

    /**
     * Marquer une demande comme lue.
     */
    public function markRead(Request $request, int $id): JsonResponse
    {
        $contact = ContactRequest::find($id);
        if (!$contact) {
            return response()->json(['success' => false, 'message' => 'Demande non trouvée.'], 404);
        }
        if (!$this->canManage($request->user(), $contact)) {
            return response()->json(['success' => false, 'message' => 'Non autorisé.'], 403);
        }
        $contact->markAsRead();
        return response()->json(['success' => true, 'message' => 'Marqué comme lu.']);
    }

    /**
     * Marquer comme répondu.
     */
    public function markReplied(Request $request, int $id): JsonResponse
    {
        $contact = ContactRequest::find($id);
        if (!$contact) {
            return response()->json(['success' => false, 'message' => 'Demande non trouvée.'], 404);
        }
        if (!$this->canManage($request->user(), $contact)) {
            return response()->json(['success' => false, 'message' => 'Non autorisé.'], 403);
        }
        $contact->markAsReplied();
        return response()->json(['success' => true, 'message' => 'Marqué comme répondu.']);
    }

    /**
     * Archiver.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $contact = ContactRequest::find($id);
        if (!$contact) {
            return response()->json(['success' => false, 'message' => 'Demande non trouvée.'], 404);
        }
        if (!$this->canManage($request->user(), $contact)) {
            return response()->json(['success' => false, 'message' => 'Non autorisé.'], 403);
        }
        $contact->archive();
        return response()->json(['success' => true, 'message' => 'Demande archivée.']);
    }

    private function canManage($user, ContactRequest $contact): bool
    {
        return $user->isAdmin() || $contact->agent_id === $user->id;
    }

    /**
     * Soumettre une demande de contact depuis le body (POST /api/v1/contact-requests avec property_id).
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

        return $this->submitContactRequest($request, (int) $propertyId);
    }
}
