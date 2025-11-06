'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from './Auth/AuthProvider';
import type { AuthUser } from '@/lib/validations/auth';

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate?: (user: AuthUser) => void;
  className?: string;
}

export default function AvatarUpload({
  currentAvatarUrl,
  onAvatarUpdate,
  className = '',
}: AvatarUploadProps) {
  const { token } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentAvatarUrl || null);
  }, [currentAvatarUrl]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB');
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setIsUploading(true);
    try {
      // Crear FormData
      const formData = new FormData();
      formData.append('avatar', file);

      // Subir a Supabase Storage (o tu servicio de almacenamiento)
      const uploadResponse = await fetch('/api/upload/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const uploadResult = await uploadResponse.json();

      if (uploadResult.success) {
        const updatedUser = uploadResult.data.user as AuthUser | undefined;
        if (updatedUser) {
          setPreviewUrl(uploadResult.data.signedUrl || null);
          onAvatarUpdate?.(updatedUser);
        }
      } else {
        throw new Error(uploadResult.message);
      }
    } catch (error) {
      console.error('Error subiendo avatar:', error);
      alert('Error subiendo la imagen. Inténtalo de nuevo.');
      setPreviewUrl(currentAvatarUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800"
        onClick={handleClick}
        aria-label="Cambiar avatar"
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-300">
            <svg
              className="h-8 w-8 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}

        {/* Overlay de hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100">
          {isUploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-white"></div>
          ) : (
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <p className="text-xs text-gray-500 mt-1 text-center">
        {isUploading ? 'Subiendo...' : 'Click para cambiar'}
      </p>
    </div>
  );
}
