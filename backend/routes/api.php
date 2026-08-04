<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AgentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\ContactRequestController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\SocialAuthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - IMMO Platform v1
|--------------------------------------------------------------------------
*/

// ==================== HEALTH ====================
Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'immo-api',
    'time' => now()->toIso8601String(),
]));

// ==================== ROUTES PUBLIQUES ====================

// Authentification
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Authentification Sociale (Google)
Route::get('/auth/google', [SocialAuthController::class, 'redirectToGoogle']);
Route::get('/auth/google/callback', [SocialAuthController::class, 'handleGoogleCallback']);
Route::post('/auth/google/token', [SocialAuthController::class, 'loginWithGoogleToken']);

// Propriétés (lecture publique)
Route::get('/properties', [PropertyController::class, 'index']);
Route::get('/properties/featured', [PropertyController::class, 'featured']);
Route::get('/properties/nearby', [PropertyController::class, 'nearby']);
Route::get('/properties/{id}', [PropertyController::class, 'show'])->whereNumber('id')->name('properties.show');

// Demande de contact (publique)
Route::post('/properties/{id}/contact', [ContactRequestController::class, 'store'])->whereNumber('id');

// Agents (public)
Route::get('/agents', [AgentController::class, 'index']);
Route::get('/agents/{id}', [AgentController::class, 'show'])->whereNumber('id');

// Avis (lecture publique + dépôt anonyme)
Route::get('/agents/{agentId}/ratings', [RatingController::class, 'index'])->whereNumber('agentId');
Route::get('/agents/{agentId}/ratings/stats', [RatingController::class, 'stats'])->whereNumber('agentId');
Route::post('/ratings', [RatingController::class, 'store']);

// Catalogue (avec vérification mot de passe)
Route::post('/catalog/verify', [CatalogController::class, 'verify']);
Route::get('/catalog/download', [CatalogController::class, 'download']);
Route::get('/catalog', [CatalogController::class, 'show']);

// Paiements — public (achat catalogue sans compte)
Route::post('/payments/catalog', [PaymentController::class, 'initiateCatalogPayment']);
Route::get('/payments/{transactionId}/status', [PaymentController::class, 'status']);
Route::get('/payments/{transactionId}/claim-catalog', [PaymentController::class, 'claimCatalog']);
Route::post('/payments/webhook', [PaymentController::class, 'webhook']);
// Sandbox uniquement
Route::post('/payments/sandbox/{transactionId}/complete', [PaymentController::class, 'sandboxComplete']);

// ==================== ROUTES PROTÉGÉES ====================

Route::middleware(['auth:sanctum'])->group(function () {

    // Authentification
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/logout-all', [AuthController::class, 'logoutAll']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::put('/password', [AuthController::class, 'changePassword']);

    // Gestion compte Google lié
    Route::post('/auth/google/link', [SocialAuthController::class, 'linkGoogleAccount']);
    Route::post('/auth/google/unlink', [SocialAuthController::class, 'unlinkGoogleAccount']);

    // Propriétés (CRUD pour agents/admins)
    Route::post('/properties', [PropertyController::class, 'store']);
    Route::put('/properties/{id}', [PropertyController::class, 'update'])->whereNumber('id');
    Route::post('/properties/{id}', [PropertyController::class, 'update'])->whereNumber('id'); // pour FormData multipart
    Route::delete('/properties/{id}', [PropertyController::class, 'destroy'])->whereNumber('id');
    Route::get('/my-properties', [PropertyController::class, 'myProperties']);
    Route::get('/agent/stats', [AgentController::class, 'myStats']);

    // Favoris
    Route::get('/favorites', [FavoriteController::class, 'index']);
    Route::post('/favorites', [FavoriteController::class, 'storeFromBody']); // POST /favorites with property_id in body
    Route::get('/favorites/ids', [FavoriteController::class, 'ids']);
    Route::get('/favorites/{propertyId}/check', [FavoriteController::class, 'check'])->whereNumber('propertyId');
    Route::post('/favorites/{propertyId}', [FavoriteController::class, 'store'])->whereNumber('propertyId');
    Route::delete('/favorites/{propertyId}', [FavoriteController::class, 'destroy'])->whereNumber('propertyId');

    // Demandes de contact (agent : ses messages, admin : tous)
    Route::get('/contact-requests', [ContactRequestController::class, 'index']);
    Route::post('/contact-requests', [ContactRequestController::class, 'storeFromBody']); // POST /contact-requests with property_id in body
    Route::post('/contact-requests/{id}/read', [ContactRequestController::class, 'markRead'])->whereNumber('id');
    Route::post('/contact-requests/{id}/replied', [ContactRequestController::class, 'markReplied'])->whereNumber('id');
    Route::delete('/contact-requests/{id}', [ContactRequestController::class, 'destroy'])->whereNumber('id');

    // ==================== ROUTES ADMIN ====================

    Route::middleware(['role:admin'])->group(function () {

        // Statistiques
        Route::get('/stats/properties', [PropertyController::class, 'stats']);
        Route::get('/stats/catalog', [CatalogController::class, 'stats']);

        // Gestion des avis
        Route::get('/ratings/pending', [RatingController::class, 'pending']);
        Route::post('/ratings/{id}/approve', [RatingController::class, 'approve'])->whereNumber('id');
        Route::post('/ratings/{id}/reject', [RatingController::class, 'reject'])->whereNumber('id');

        // Gestion du catalogue
        Route::get('/catalog/password', [CatalogController::class, 'currentPassword']);
        Route::get('/catalog/status', [CatalogController::class, 'status']); // Status endpoint
        Route::post('/catalog/rotate', [CatalogController::class, 'rotate']);
        Route::get('/catalog/history', [CatalogController::class, 'history']);

        // Gestion des biens en vedette (Admin)
        Route::get('/admin/properties', [AdminController::class, 'properties']);
        Route::get('/admin/properties/featured', [AdminController::class, 'featuredProperties']);
        Route::post('/admin/properties/{id}/featured', [AdminController::class, 'toggleFeatured'])->whereNumber('id');
        Route::post('/admin/properties/featured/order', [AdminController::class, 'setFeaturedOrder']);
        Route::get('/admin/dashboard', [AdminController::class, 'dashboardStats']);
        
        // Gestion des utilisateurs
        Route::get('/admin/users', [AdminController::class, 'users']);
        Route::post('/admin/users/{id}/activate', [AdminController::class, 'activateUser'])->whereNumber('id');
        Route::post('/admin/users/{id}/deactivate', [AdminController::class, 'deactivateUser'])->whereNumber('id');
    });
});

// ==================== FALLBACK ====================

Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'Route non trouvée.',
    ], 404);
});
