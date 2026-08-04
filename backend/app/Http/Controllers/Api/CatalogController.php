<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CatalogAccessLog;
use App\Models\CatalogPassword;
use App\Models\Property;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class CatalogController extends Controller
{
    /**
     * Vérifier un mot de passe et retourner les infos d'accès
     */
    public function verify(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'password' => ['required', 'string', 'size:8'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Mot de passe invalide.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $ip = $request->ip();
        $password = $request->password;

        // Vérifier le rate limiting
        if (CatalogAccessLog::isRateLimited($ip, 5, 60)) {
            return response()->json([
                'success' => false,
                'message' => 'Trop de tentatives échouées. Veuillez réessayer dans une heure.',
                'error_code' => 'RATE_LIMITED',
            ], 429);
        }

        // Rechercher le mot de passe
        $catalogPassword = CatalogPassword::where('password', $password)->first();

        if (!$catalogPassword) {
            // Enregistrer la tentative échouée
            $this->logAccessAttempt(null, $ip, $request->userAgent(), false, 'INVALID_PASSWORD');

            return response()->json([
                'success' => false,
                'message' => 'Mot de passe invalide.',
                'error_code' => 'INVALID_PASSWORD',
            ], 401);
        }

        // Vérifier la validité
        if (!$catalogPassword->is_valid) {
            $reason = !$catalogPassword->is_active ? 'PASSWORD_INACTIVE' : 'PASSWORD_EXPIRED';
            
            $this->logAccessAttempt($catalogPassword->id, $ip, $request->userAgent(), false, $reason);

            return response()->json([
                'success' => false,
                'message' => $reason === 'PASSWORD_EXPIRED' 
                    ? 'Ce mot de passe a expiré.' 
                    : 'Ce mot de passe n\'est plus actif.',
                'error_code' => $reason,
            ], 401);
        }

        // Enregistrer l'accès réussi
        $this->logAccessAttempt($catalogPassword->id, $ip, $request->userAgent(), true);

        return response()->json([
            'success' => true,
            'message' => 'Accès autorisé.',
            'data' => [
                'valid_until' => $catalogPassword->valid_until->toIso8601String(),
                'time_remaining' => $catalogPassword->time_remaining,
                'uses_remaining' => $catalogPassword->uses_remaining,
            ],
        ]);
    }

    /**
     * Générer et télécharger le catalogue PDF
     */
    public function download(Request $request): Response
    {
        $validator = Validator::make($request->all(), [
            'password' => ['required', 'string', 'size:8'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Mot de passe invalide.',
            ], 422);
        }

        $ip = $request->ip();
        $password = $request->password;

        // Vérifier le rate limiting
        if (CatalogAccessLog::isRateLimited($ip, 5, 60)) {
            return response()->json([
                'success' => false,
                'message' => 'Trop de tentatives échouées.',
            ], 429);
        }

        // Vérifier le mot de passe
        $catalogPassword = CatalogPassword::where('password', $password)->first();

        if (!$catalogPassword || !$catalogPassword->is_valid) {
            $this->logAccessAttempt(
                $catalogPassword?->id, 
                $ip, 
                $request->userAgent(), 
                false, 
                $catalogPassword ? 'PASSWORD_INVALID' : 'INVALID_PASSWORD'
            );

            return response()->json([
                'success' => false,
                'message' => 'Mot de passe invalide ou expiré.',
            ], 401);
        }

        // Enregistrer l'accès
        $this->logAccessAttempt($catalogPassword->id, $ip, $request->userAgent(), true);

        // Générer le PDF
        $pdf = $this->generateCatalogPdf();

        return $pdf->download('immo-catalogue-' . date('Y-m-d') . '.pdf');
    }

    /**
     * Afficher le catalogue en ligne (après vérification)
     */
    public function show(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'password' => ['required', 'string', 'size:8'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Mot de passe invalide.',
            ], 422);
        }

        $ip = $request->ip();
        $password = $request->password;

        // Vérifier le rate limiting
        if (CatalogAccessLog::isRateLimited($ip, 5, 60)) {
            return response()->json([
                'success' => false,
                'message' => 'Trop de tentatives échouées.',
            ], 429);
        }

        // Vérifier le mot de passe
        $catalogPassword = CatalogPassword::where('password', $password)->first();

        if (!$catalogPassword || !$catalogPassword->is_valid) {
            return response()->json([
                'success' => false,
                'message' => 'Mot de passe invalide ou expiré.',
            ], 401);
        }

        // Enregistrer l'accès
        $this->logAccessAttempt($catalogPassword->id, $ip, $request->userAgent(), true);

        // Récupérer les propriétés classées
        $properties = $this->getCatalogProperties();

        return response()->json([
            'success' => true,
            'data' => [
                'valid_until' => $catalogPassword->valid_until->toIso8601String(),
                'time_remaining' => $catalogPassword->time_remaining,
                'properties' => $properties,
                'generated_at' => now()->toIso8601String(),
            ],
        ]);
    }

    /**
     * Obtenir le mot de passe actuel (Admin)
     */
    public function currentPassword(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Non autorisé.',
            ], 403);
        }

        $currentPassword = CatalogPassword::getCurrentValid();

        if (!$currentPassword) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun mot de passe actif.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'password' => $currentPassword->password,
                'valid_from' => $currentPassword->valid_from->toIso8601String(),
                'valid_until' => $currentPassword->valid_until->toIso8601String(),
                'time_remaining' => $currentPassword->time_remaining,
                'uses_remaining' => $currentPassword->uses_remaining,
                'current_uses' => $currentPassword->current_uses,
                'max_uses' => $currentPassword->max_uses,
            ],
        ]);
    }

    /**
     * Obtenir le statut du catalogue (Admin)
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Non autorisé.',
            ], 403);
        }

        $currentPassword = CatalogPassword::getCurrentValid();

        return response()->json([
            'success' => true,
            'data' => [
                'has_active_password' => $currentPassword !== null,
                'password' => $currentPassword ? [
                    'id' => $currentPassword->id,
                    'valid_from' => $currentPassword->valid_from->toIso8601String(),
                    'valid_until' => $currentPassword->valid_until->toIso8601String(),
                    'time_remaining' => $currentPassword->time_remaining,
                    'uses_remaining' => $currentPassword->uses_remaining,
                    'current_uses' => $currentPassword->current_uses,
                    'max_uses' => $currentPassword->max_uses,
                ] : null,
            ],
        ]);
    }

    /**
     * Forcer la rotation du mot de passe (Admin)
     */
    public function rotate(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Non autorisé.',
            ], 403);
        }

        $newPassword = CatalogPassword::rotate();

        return response()->json([
            'success' => true,
            'message' => 'Mot de passe rotaté avec succès.',
            'data' => [
                'password' => $newPassword->password,
                'valid_from' => $newPassword->valid_from->toIso8601String(),
                'valid_until' => $newPassword->valid_until->toIso8601String(),
            ],
        ]);
    }

    /**
     * Historique des mots de passe (Admin)
     */
    public function history(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Non autorisé.',
            ], 403);
        }

        $passwords = CatalogPassword::orderByDesc('created_at')
            ->paginate($request->input('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => [
                'passwords' => $passwords->map(fn($p) => [
                    'id' => $p->id,
                    'password' => $p->password,
                    'valid_from' => $p->valid_from->toIso8601String(),
                    'valid_until' => $p->valid_until->toIso8601String(),
                    'is_active' => $p->is_active,
                    'is_valid' => $p->is_valid,
                    'current_uses' => $p->current_uses,
                    'max_uses' => $p->max_uses,
                    'created_at' => $p->created_at->toIso8601String(),
                ]),
                'pagination' => [
                    'current_page' => $passwords->currentPage(),
                    'last_page' => $passwords->lastPage(),
                    'per_page' => $passwords->perPage(),
                    'total' => $passwords->total(),
                ],
            ],
        ]);
    }

    /**
     * Statistiques d'accès au catalogue (Admin)
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Non autorisé.',
            ], 403);
        }

        $stats = [
            'total_accesses' => CatalogAccessLog::count(),
            'successful_accesses' => CatalogAccessLog::successful()->count(),
            'failed_accesses' => CatalogAccessLog::failed()->count(),
            'accesses_today' => CatalogAccessLog::whereDate('accessed_at', today())->count(),
            'accesses_this_week' => CatalogAccessLog::whereBetween('accessed_at', [now()->startOfWeek(), now()->endOfWeek()])->count(),
            'current_password_uses' => CatalogPassword::getCurrentValid()?->current_uses ?? 0,
            'unique_ips' => CatalogAccessLog::distinct('ip_address')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    // ==================== MÉTHODES PRIVÉES ====================

    private function logAccessAttempt(?int $passwordId, string $ip, ?string $userAgent, bool $success, ?string $failureReason = null): void
    {
        if ($passwordId) {
            CatalogAccessLog::create([
                'catalog_password_id' => $passwordId,
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'accessed_at' => now(),
                'success' => $success,
                'failure_reason' => $failureReason,
            ]);
        }
    }

    private function getCatalogProperties(): array
    {
        $properties = Property::published()
            ->with('agent:id,first_name,last_name,phone,email,agency_name')
            ->orderByStanding()
            ->orderBy('type')
            ->orderByDesc('is_premium')
            ->orderByDesc('created_at')
            ->get();

        return $properties->map(fn($p) => [
            'id' => $p->id,
            'title' => $p->title,
            'type' => $p->type_label,
            'standing' => $p->standing_label,
            'transaction_type' => $p->transaction_type_label,
            'price' => $p->formatted_price,
            'area' => $p->area,
            'bedrooms' => $p->bedrooms,
            'bathrooms' => $p->bathrooms,
            'city' => $p->city,
            'quartier' => $p->quartier,
            'main_image' => $p->main_image_url,
            'agent' => [
                'name' => $p->agent?->full_name,
                'phone' => $p->agent?->phone,
                'email' => $p->agent?->email,
                'agency' => $p->agent?->agency_name,
            ],
            'qr_code' => $this->generateQrCode(route('properties.show', $p->id)),
        ])->toArray();
    }

    private function generateCatalogPdf(): \Barryvdh\DomPDF\PDF
    {
        $properties = $this->getCatalogProperties();

        // Grouper par standing puis par type
        $grouped = collect($properties)->groupBy('standing')->map(
            fn($standingGroup) => $standingGroup->groupBy('type')
        );

        $data = [
            'title' => 'Catalogue IMMO - ' . date('d/m/Y'),
            'generated_at' => now()->format('d/m/Y H:i'),
            'properties' => $properties,
            'grouped_properties' => $grouped,
            'total_count' => count($properties),
        ];

        return Pdf::loadView('pdf.catalog', $data)
            ->setPaper('a4')
            ->setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'defaultFont' => 'helvetica',
            ]);
    }

    private function generateQrCode(string $url): string
    {
        try {
            return base64_encode(QrCode::format('png')
                ->size(150)
                ->margin(2)
                ->generate($url));
        } catch (\Exception $e) {
            return '';
        }
    }
}
