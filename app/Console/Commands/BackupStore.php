<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Process;
use ZipArchive;

class BackupStore extends Command
{
    protected $signature = 'store:backup {--keep=10 : Quantos backups manter}';
    protected $description = 'Dump do MySQL + storage (fora da public), compactado, com rotação';

    public function handle(): int
    {
        $dir = storage_path('app/backups');
        File::ensureDirectoryExists($dir);

        $stamp = now()->format('Ymd-His');
        $sqlFile = "{$dir}/db-{$stamp}.sql";
        $storageCopy = "{$dir}/storage-{$stamp}";
        $zipPath = "{$dir}/backup-{$stamp}.zip";

        $mysqldump = env('MYSQLDUMP_PATH', 'mysqldump');
        $db = config('database.connections.mysql');
        $port = $db['port'] ?? 3306;

        // dump via Process (array = sem shell, sem risco de injection; senha via env, não some na CLI)
        $result = Process::timeout(300)
            ->env(['MYSQL_PWD' => $db['password']])
            ->run([
                $mysqldump,
                '--user=' . $db['username'],
                '--host=' . $db['host'],
                '--port=' . $port,
                '--single-transaction',
                $db['database'],
            ]);

        if (! $result->successful()) {
            $msg = 'Backup falhou no mysqldump: ' . $result->errorOutput();
            $this->error($msg);
            Log::error($msg);
            return self::FAILURE;
        }

        File::put($sqlFile, $result->output());

        if (File::size($sqlFile) === 0) {
            $this->error('Dump gerado ficou vazio, algo deu errado.');
            Log::error('Backup: dump vazio em ' . $sqlFile);
            return self::FAILURE;
        }

        File::copyDirectory(storage_path('app/public'), $storageCopy);

        // compacta tudo num único zip e remove os arquivos soltos
        $zip = new ZipArchive();
        if ($zip->open($zipPath, ZipArchive::CREATE) !== true) {
            $this->error('Não foi possível criar o zip do backup.');
            Log::error('Backup: falha ao abrir zip ' . $zipPath);
            return self::FAILURE;
        }

        $zip->addFile($sqlFile, basename($sqlFile));
        foreach (File::allFiles($storageCopy) as $file) {
            $relative = 'storage/' . $file->getRelativePathname();
            $zip->addFile($file->getPathname(), $relative);
        }
        $zip->close();

        File::delete($sqlFile);
        File::deleteDirectory($storageCopy);

        $this->info("Backup criado: {$zipPath}");
        Log::info('Backup criado com sucesso: ' . $zipPath);

        $this->rotate($dir, (int) $this->option('keep'));

        return self::SUCCESS;
    }

    private function rotate(string $dir, int $keep): void
    {
        $backups = collect(File::files($dir))
            ->filter(fn ($f) => str_starts_with($f->getFilename(), 'backup-') && $f->getExtension() === 'zip')
            ->sortByDesc(fn ($f) => $f->getMTime())
            ->values();

        foreach ($backups->slice($keep) as $old) {
            File::delete($old->getPathname());
            Log::info('Backup antigo removido: ' . $old->getFilename());
        }
    }
}