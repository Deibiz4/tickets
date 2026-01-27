import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
import { ArrowLeft, Calendar, User, Edit, Trash2, Paperclip, Download } from 'lucide-react';
import 'react-quill/dist/quill.snow.css'; // Import styles for content rendering

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
    const [attachments, setAttachments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token && id) {
            fetchArticle();
            fetchAttachments();
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

    const handleDownload = (path: string) => {
        // Construct the full URL for the file
        // path comes as 'uploads/filename.ext' from DB
        const url = `${import.meta.env.VITE_API_URL.replace('/api', '')}/${path.replace(/\\/g, '/')}`;
        window.open(url, '_blank');
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
                <CardContent className="p-8">
                    <div className="prose max-w-none ql-editor p-0">
                        <div dangerouslySetInnerHTML={{ __html: article.content }} />
                    </div>

                    {attachments.length > 0 && (
                        <div className="mt-8 pt-8 border-t">
                            <h3 className="text-lg font-medium flex items-center gap-2 mb-4">
                                <Paperclip className="h-5 w-5" />
                                Adjuntos
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {attachments.map(att => (
                                    <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="bg-white p-2 rounded border">
                                                <Paperclip className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-sm font-medium truncate">{att.file_name}</span>
                                                <span className="text-xs text-gray-500">{(att.file_size / 1024).toFixed(1)} KB</span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDownload(att.file_path)}
                                        >
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

