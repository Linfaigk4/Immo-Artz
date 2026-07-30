<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function (): void {
    $this->comment('Build trusted real-estate experiences.');
})->purpose('Display an inspirational message');
