import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_ENDPOINTS } from '@/config/api';
import { TicketConversation } from '@/components/TicketConversation';
import { RichEditor } from '@/components/RichEditor';

export function TicketForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isEditing = !!id;

    const [creatorInfo, setCreatorInfo] = useState<{ name: string; department: string | null } | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        status: 'open'
    });
    const [file, setFile] = useState<File | null>(null);

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
                } catch (err) {
                    setError('No se pudo cargar el ticket');
                }
            };
            fetchTicket();
        }
    }, [id, isEditing]);

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
                body = JSON.stringify(formData);
            }

            const response = await fetch(url, {
                method,
                headers,
                body
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || errorData.message || 'Error al guardar el ticket');
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
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="title">Título</Label>
                    <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        placeholder="Resumen del problema"
                        disabled={isEditing}
                    />
                </div>

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
                            onChange={(e) => {
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
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
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
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="open">Abierto</option>
                                <option value="in_progress">En Progreso</option>
                                <option value="waiting">En Espera</option>
                                <option value="closed">Cerrado</option>
                            </select>
                        </div>
                    )}
                </div>

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
