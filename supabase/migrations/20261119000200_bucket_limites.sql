-- Bucket `produtos`: limite de 5 MB por arquivo e só imagens jpg/png/webp (defesa em profundidade;
-- a Edge Function `admin-fotos` já valida a assinatura dos bytes antes de gravar).
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = '{image/jpeg,image/png,image/webp}'
where id = 'produtos';
