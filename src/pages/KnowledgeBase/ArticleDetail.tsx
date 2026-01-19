import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
import { ArrowLeft, Calendar, User, Edit, Trash2 } from 'lucide-react';

interface Article {
    id: number;
    title: string;
    content: string;
    category_name: string;
    author_name: string;
    created_at: string;
    updated_at: string;
}

export function ArticleDetail() {
    const { id } = useParams();
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [article, setArticle] = useState<Article | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token && id) {
            fetchArticle();
        }
    }, [token, id]);

    const fetchArticle = async () => {
        try {
            const response = await fetch(`${API_ENDPOINTS.KB.ARTICLES}/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setArticle(await response.json());
            } else {
                navigate('/dashboard/kb');
            }
        } catch (error) {
            console.error('Error fetching article:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este artículo?')) return;
        try {
            await fetch(`${API_ENDPOINTS.KB.ARTICLES}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            navigate('/dashboard/kb');
        } catch (error) {
            console.error('Error deleting article:', error);
        }
    };

    const isAdminOrAgent = user?.role === 'admin' || user?.role === 'agent';

    if (loading) return <div>Cargando...</div>;
    if (!article) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" onClick={() => navigate('/dashboard/kb')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
            </Button>

            <div className="flex justify-between items-start">
                <div>
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        {article.category_name}
                    </span>
                    <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">{article.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                        <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {article.author_name}
                        </div>
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(article.created_at).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                {isAdminOrAgent && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/kb/${id}/edit`)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleDelete}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            <Card>
                <CardContent className="p-8 prose max-w-none">
                    <div className="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">
                        {article.content}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
