import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Assuming simple textarea for now
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
import { ArrowLeft, Save } from 'lucide-react';

interface Category {
    id: number;
    name: string;
}

export function ArticleEditor() {
    const { id } = useParams();
    const isEditing = !!id;
    const { token } = useAuth();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            fetchCategories();
            if (isEditing) fetchArticle();
        }
    }, [token, id]);

    const fetchCategories = async () => {
        const res = await fetch(API_ENDPOINTS.KB.CATEGORIES, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setCategories(await res.json());
        if (!isEditing) setLoading(false);
    };

    const fetchArticle = async () => {
        const res = await fetch(`${API_ENDPOINTS.KB.ARTICLES}/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setTitle(data.title);
            setContent(data.content);
            setCategoryId(data.category_id.toString());
        }
        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = isEditing
            ? `${API_ENDPOINTS.KB.ARTICLES}/${id}`
            : API_ENDPOINTS.KB.ARTICLES;

        const method = isEditing ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                content,
                category_id: parseInt(categoryId),
                is_published: true
            })
        });

        if (res.ok) {
            navigate('/dashboard/kb');
        } else {
            alert('Error al guardar el artículo');
        }
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => navigate('/dashboard/kb')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">{isEditing ? 'Editar Artículo' : 'Nuevo Artículo'}</h1>
            </div>

            <Card>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="title">Título</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="Ej: Cómo restablecer contraseña"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category">Categoría</Label>
                            <Select value={categoryId} onValueChange={setCategoryId} required>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id.toString()}>
                                            {cat.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Contenido</Label>
                            <Textarea
                                id="content"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                                className="min-h-[300px] font-mono text-sm"
                                placeholder="Escribe el contenido del artículo aquí (soporta texto plano por ahora)..."
                            />
                        </div>

                        <div className="flex justify-end gap-2">
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
