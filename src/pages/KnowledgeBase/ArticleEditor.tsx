import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
import { ArrowLeft, Save, Trash, Paperclip, Loader2 } from 'lucide-react';
import { RichEditor } from '@/components/RichEditor';

interface Category {
    id: number;
    name: string;
}

export function ArticleEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useAuth();
    const isEditing = !!id;

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isEditing) {
            fetchArticle();
            fetchAttachments();
        } else {
            setLoading(false);
        }
        fetchCategories();
    }, [isEditing, id, token]);

    const fetchAttachments = async () => {
        try {
            const response = await fetch(`${API_ENDPOINTS.KB.ARTICLES}/${id}/attachments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setAttachments(await response.json());
            }
        } catch (error) {
            console.error('Error fetching attachments:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];

        if (!id) {
            alert('Primero debes guardar el artículo para adjuntar archivos.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch(`${API_ENDPOINTS.KB.ARTICLES}/${id}/attachments`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                const newAttachment = await response.json();
                setAttachments([newAttachment, ...attachments]);
            } else {
                alert('Error al subir archivo');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error al subir archivo');
        } finally {
            setUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleDeleteAttachment = async (attachmentId: number) => {
        if (!confirm('¿Estás seguro de eliminar este adjunto?')) return;

        try {
            const response = await fetch(`${API_ENDPOINTS.KB.ARTICLES}/${id}/attachments/${attachmentId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setAttachments(attachments.filter(a => a.id !== attachmentId));
            } else {
                alert('Error al eliminar adjunto');
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const fetchArticle = async () => {
        try {
            const response = await fetch(`${API_ENDPOINTS.KB.ARTICLES}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al cargar artículo');
            const data = await response.json();
            setTitle(data.title);
            setContent(data.content);
            setCategoryId(data.category_id.toString());
        } catch (err) {
            setError('No se pudo cargar el artículo');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.KB.CATEGORIES, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setCategories(await response.json());
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            const url = isEditing
                ? `${API_ENDPOINTS.KB.ARTICLES}/${id}`
                : API_ENDPOINTS.KB.ARTICLES;

            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    content,
                    category_id: parseInt(categoryId)
                })
            });

            if (!response.ok) throw new Error('Error al guardar');

            if (!isEditing) {
                const newArticle = await response.json();
                navigate(`/dashboard/kb/${newArticle.id}/edit`); // Ir a editar para poder subir adjuntos
            } else {
                navigate(`/dashboard/kb/${id}`);
            }
        } catch (err) {
            setError('Error al guardar el artículo');
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/dashboard/kb')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Editar Artículo' : 'Nuevo Artículo'}
                </h1>
            </div>

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="title">Título</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="Cómo reiniciar el servidor..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Categoría</Label>
                            <select
                                id="category"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                required
                            >
                                <option value="" disabled>Selecciona una categoría</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id.toString()}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label>Contenido</Label>
                            <RichEditor
                                value={content}
                                onChange={setContent}
                                placeholder="Escribe aquí el contenido del artículo... Puedes pegar imágenes."
                            />
                        </div>

                        {/* Attachments Section - Only visible when editing or after saving (implied by having ID) */}
                        {id && (
                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="text-lg font-medium flex items-center gap-2">
                                    <Paperclip className="h-5 w-5" />
                                    Adjuntos
                                </h3>

                                <div className="space-y-2">
                                    {attachments.map(att => (
                                        <div key={att.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                                            <span className="text-sm truncate max-w-[300px]">{att.file_name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">
                                                    {(att.file_size / 1024).toFixed(1)} KB
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteAttachment(att.id)}
                                                    type="button"
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="flex items-center gap-2 mt-2">
                                        <Input
                                            type="file"
                                            onChange={handleFileUpload}
                                            disabled={uploading}
                                            className="max-w-xs"
                                        />
                                        {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Guarda el artículo antes de subir archivos.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-4 pt-4">
                            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/kb')}>
                                Cancelar
                            </Button>
                            <Button type="submit">
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Artículo
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
