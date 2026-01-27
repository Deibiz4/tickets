import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_ENDPOINTS } from '@/config/api';
import { BookOpen, User } from 'lucide-react';
import { TicketConversation } from '@/components/TicketConversation';
import { RichEditor } from '@/components/RichEditor';
import { useAuth } from '@/context/AuthContext';

interface AdminUser {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
}

export function TicketForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isEditing = !!id;
    const isAdmin = currentUser?.role === 'admin';

    const [creatorInfo, setCreatorInfo] = useState<{ name: string; department: string | null } | null>(null);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [assignedTo, setAssignedTo] = useState<string>('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        status: 'open'
    });
    const [file, setFile] = useState<File | null>(null);
    const [suggestedArticles, setSuggestedArticles] = useState<any[]>([]);

    // Fetch ticket data when editing
    useEffect(() => {
        if (isEditing) {
            const fetchTicket = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(API_ENDPOINTS.TICKETS.BY_ID(id!), {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) throw new Error('Error al cargar el ticket');

                    const data = await response.json();
                    setFormData({
                        title: data.title,
                        description: data.description,
                        priority: data.priority,
                        status: data.status
                    });
                    setCreatorInfo({
                        name: data.creator_full_name || data.creator_username,
                        department: data.creator_department
                    });
                    // Set current assignment
                    if (data.assigned_to) {
                        setAssignedTo(String(data.assigned_to));
                    }
                } catch (err) {
                    setError('No se pudo cargar el ticket');
                }
            };
            fetchTicket();
        }
    }, [id, isEditing]);

    // Fetch users list for assignment (admin only)
    useEffect(() => {
        if (isEditing && isAdmin) {
            const fetchUsers = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(API_ENDPOINTS.USERS.BASE, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setUsers(data);
                    }
                } catch (error) {
                    console.error("Error fetching users:", error);
                }
            };
            fetchUsers();
        }
    }, [isEditing, isAdmin]);

    useEffect(() => {
        const searchKB = async () => {
            if (!formData.title || formData.title.length < 3) {
                setSuggestedArticles([]);
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_ENDPOINTS.KB.ARTICLES}?search=${encodeURIComponent(formData.title)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const articles = await response.json();
                    setSuggestedArticles(articles.slice(0, 3));
                }
            } catch (error) {
                console.error("Error searching KB:", error);
            }
        };

        const timeoutId = setTimeout(searchKB, 500);
        return () => clearTimeout(timeoutId);
    }, [formData.title]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const url = isEditing
                ? API_ENDPOINTS.TICKETS.BY_ID(id!)
                : API_ENDPOINTS.TICKETS.BASE;

            const method = isEditing ? 'PUT' : 'POST';

            let body;
            const headers: HeadersInit = {
                'Authorization': `Bearer ${token}`
            };

            if (file && !isEditing) {
                // Usar FormData para enviar archivo (solo en creación por ahora)
                const formDataObj = new FormData();
                formDataObj.append('title', formData.title);
                formDataObj.append('description', formData.description);
                formDataObj.append('priority', formData.priority);
                formDataObj.append('file', file);

                body = formDataObj;
            } else {
                headers['Content-Type'] = 'application/json';
                // Include assignedTo in the request body for admins
                const requestData: any = { ...formData };
                if (isAdmin && assignedTo) {
                    requestData.assignedTo = parseInt(assignedTo);
                }
                body = JSON.stringify(requestData);
            }

            const response = await fetch(url, {
                method,
                headers,
                body
            });

            if (!response.ok) {
                const errorData = await response.json();

                let errorMessage = errorData.msg || errorData.message || 'Error al guardar el ticket';

                if (errorData.errors && Array.isArray(errorData.errors)) {
                    const validationMessages = errorData.errors.map((e: any) => `${e.field}: ${e.message}`);
                    errorMessage += '\n' + validationMessages.join('\n');
                }

                throw new Error(errorMessage);
            }

            navigate('/dashboard/tickets');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditing ? 'Editar Ticket' : 'Nuevo Ticket'}
                    </h1>
                    {isEditing && creatorInfo && (
                        <p className="mt-1 text-sm text-gray-500">
                            Solicitado por: <span className="font-medium text-gray-900">{creatorInfo.name}</span>
                            {creatorInfo.department && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {creatorInfo.department}
                                </span>
                            )}
                        </p>
                    )}
                </div>
            </div>

            {isEditing && id && (
                <TicketConversation ticketId={id} />
            )}

            <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow sm:rounded-lg p-6">
                {error && (
                    <div className="bg-red-50 p-4 rounded-md text-red-700 text-sm">
                        <p className="font-bold">Error:</p>
                        <ul className="list-disc list-inside">
                            {error.split('\n').map((err, index) => (
                                <li key={index}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                        id="title"
                        value={formData.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="Resumen del problema"
                        disabled={isEditing}
                    />
                </div>

                {suggestedArticles.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Artículos relacionados:
                        </h4>
                        <ul className="text-sm space-y-1">
                            {suggestedArticles.map(article => (
                                <li key={article.id}>
                                    <a
                                        href={`/dashboard/kb/${article.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        {article.title}
                                        <span className="text-xs text-gray-500">({article.category_name})</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="description">Descripción</Label>
                    <div className="prose-sm">
                        <RichEditor
                            value={formData.description}
                            onChange={(value) => setFormData({ ...formData, description: value })}
                            placeholder="Detalles completos del problema..."
                            disabled={isEditing}
                        />
                    </div>
                </div>

                {!isEditing && (
                    <div className="space-y-2">
                        <Label htmlFor="file">Adjuntar Archivo (Opcional)</Label>
                        <Input
                            id="file"
                            type="file"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                if (e.target.files && e.target.files[0]) {
                                    setFile(e.target.files[0]);
                                }
                            }}
                            className="cursor-pointer"
                        />
                        <p className="text-xs text-gray-500">
                            Soporta imágenes, PDF y Word (Máx 5MB)
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="priority">Prioridad</Label>
                        <select
                            id="priority"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={formData.priority}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, priority: e.target.value })}
                        >
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="critical">Crítica</option>
                        </select>
                    </div>

                    {isEditing && (
                        <div className="space-y-2">
                            <Label htmlFor="status">Estado</Label>
                            <select
                                id="status"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.status}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="open">Abierto</option>
                                <option value="in_progress">En Progreso</option>
                                <option value="waiting">En Espera</option>
                                <option value="closed">Cerrado</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* User Assignment - Admin Only */}
                {isEditing && isAdmin && (
                    <div className="space-y-2 border-t pt-4">
                        <Label htmlFor="assignedTo" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Asignar a Usuario
                        </Label>
                        <select
                            id="assignedTo"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={assignedTo}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAssignedTo(e.target.value)}
                        >
                            <option value="">Sin asignar</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.full_name} ({user.email})
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500">
                            Al asignar un usuario, recibirá una notificación por correo electrónico.
                        </p>
                    </div>
                )}

                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate('/dashboard/tickets')}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Ticket')}
                    </Button>
                </div>
            </form>

        </div>
    );
}
