import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
import { Search, BookOpen, Plus, Tag } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface Article {
    id: number;
    title: string;
    content: string;
    category_name: string;
    author_name: string;
    created_at: string;
}

interface Category {
    id: number;
    name: string;
    description: string;
}

export function KBIndex() {
    const { token, user } = useAuth();
    const [articles, setArticles] = useState<Article[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    const fetchData = async () => {
        try {
            const [artRes, catRes] = await Promise.all([
                fetch(`${API_ENDPOINTS.KB.ARTICLES}?search=${search}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }),
                fetch(API_ENDPOINTS.KB.CATEGORIES, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
            ]);

            if (artRes.ok) setArticles(await artRes.json());
            if (catRes.ok) setCategories(await catRes.json());
        } catch (error) {
            console.error('Error fetching KB data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData();
    };

    const isAdminOrAgent = user?.role === 'admin' || user?.role === 'agent';

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Base de Conocimiento</h1>
                    <p className="text-gray-500">Encuentra respuestas rápidas y guías de ayuda.</p>
                </div>
                {isAdminOrAgent && (
                    <Button onClick={() => navigate('/dashboard/kb/new')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Artículo
                    </Button>
                )}
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                    placeholder="Buscar artículos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1"
                />
                <Button type="submit">
                    <Search className="h-4 w-4" />
                </Button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Articles List */}
                <div className="md:col-span-2 space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Artículos Recientes
                    </h2>
                    {loading ? (
                        <p>Cargando...</p>
                    ) : articles.length > 0 ? (
                        articles.map((article) => (
                            <Card key={article.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/dashboard/kb/${article.id}`)}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base text-blue-600 hover:underline">
                                            {article.title}
                                        </CardTitle>
                                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                            {article.category_name}
                                        </span>
                                    </div>
                                    <CardDescription className="line-clamp-2">
                                        {article.content.substring(0, 150)}...
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center p-8 bg-gray-50 rounded-lg">
                            <p className="text-gray-500">No se encontraron artículos.</p>
                        </div>
                    )}
                </div>

                {/* Categories Sidebar */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Categorías
                    </h2>
                    <Card>
                        <CardContent className="p-4 space-y-2">
                            {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer">
                                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
