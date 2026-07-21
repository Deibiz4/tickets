import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_ENDPOINTS } from '@/config/api';
import { BookOpen, Save, X, User, Paperclip } from 'lucide-react';
import { TicketConversation } from '@/components/TicketConversation';
import { RichEditor } from '@/components/RichEditor';
import { useAuth } from '@/context/AuthContext';
import DOMPurify from 'dompurify';

interface AdminUser {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
    department?: string;
}

const SELECT_CLASS = "flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

const PRIORITY_COLORS: Record<string, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-purple-100 text-purple-800',
    waiting: 'bg-gray-100 text-gray-700',
    closed: 'bg-red-100 text-red-800',
};

const PRIORITY_LABELS: Record<string, string> = {
    low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica',
};

const STATUS_LABELS: Record<string, string> = {
    open: 'Abierto', in_progress: 'En Progreso', waiting: 'En Espera', closed: 'Cerrado',
};

function getInitials(name: string) {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
}

export function TicketForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const isEditing = !!id;
    const isAdmin = currentUser?.role === 'admin';

    const [creatorInfo, setCreatorInfo] = useState<{ name: string; department: string | null } | null>(null);
    const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [createdBy, setCreatedBy] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'resumen' | 'relacionados'>('resumen');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        status: 'open',
        visibility: 'private',
        resolutionSummary: '',
        resolutionActions: ''
    });
    const [file, setFile] = useState<File | null>(null);
    const [suggestedArticles, setSuggestedArticles] = useState<any[]>([]);
    const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);
    const [selectedDepartment, setSelectedDepartment] = useState<string>('');

    // Fetch departments
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(API_ENDPOINTS.DEPARTMENTS.BASE, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) setDepartments(await response.json());
            } catch (e) { console.error("Error fetching departments:", e); }
        };
        fetchDepartments();
    }, []);

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
                        status: data.status,
                        visibility: data.visibility || 'private',
                        resolutionSummary: data.resolution_summary || '',
                        resolutionActions: data.resolution_actions || ''
                    });
                    if (data.department_id) setSelectedDepartment(String(data.department_id));
                    setCreatorInfo({
                        name: data.creator_full_name || data.creator_username,
                        department: data.department_name
                    });
                    if (data.assigned_to) setAssignedTo(String(data.assigned_to));
                    if (data.created_by) setCreatedBy(String(data.created_by));
                } catch (err) {
                    setError('No se pudo cargar el ticket');
                }
            };
            fetchTicket();
        }
    }, [id, isEditing]);

    // Fetch all users for admin
    useEffect(() => {
        if (isAdmin) {
            const fetchAllUsers = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(API_ENDPOINTS.USERS.BASE, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (response.ok) setAllUsers(await response.json());
                } catch (e) { console.error("Error fetching users:", e); }
            };
            fetchAllUsers();
        }
    }, [isAdmin]);

    // KB suggestions
    useEffect(() => {
        const searchKB = async () => {
            if (!formData.title || formData.title.length < 3) { setSuggestedArticles([]); return; }
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_ENDPOINTS.KB.ARTICLES}?search=${encodeURIComponent(formData.title)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) setSuggestedArticles((await response.json()).slice(0, 3));
            } catch (e) { console.error("Error searching KB:", e); }
        };
        const timeout = setTimeout(searchKB, 500);
        return () => clearTimeout(timeout);
    }, [formData.title]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        if (!isEditing && !selectedDepartment) {
            setError('Debe seleccionar un departamento');
            setIsLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const url = isEditing ? API_ENDPOINTS.TICKETS.BY_ID(id!) : API_ENDPOINTS.TICKETS.BASE;
            const method = isEditing ? 'PUT' : 'POST';

            let body;
            const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };

            if (file && !isEditing) {
                const fd = new FormData();
                fd.append('title', formData.title);
                fd.append('description', formData.description);
                fd.append('priority', formData.priority);
                fd.append('departmentId', selectedDepartment);
                fd.append('visibility', formData.visibility);
                fd.append('file', file);
                body = fd;
            } else {
                headers['Content-Type'] = 'application/json';
                const requestData: any = { ...formData };
                if (!isEditing) {
                    requestData.departmentId = parseInt(selectedDepartment);
                } else {
                    // Al editar, siempre enviamos los valores actuales para que no se pierdan
                    if (selectedDepartment) requestData.departmentId = parseInt(selectedDepartment);
                    if (assignedTo) requestData.assignedTo = parseInt(assignedTo);
                    else requestData.assignedTo = null; // permite des-asignar
                    if (isAdmin && createdBy) requestData.createdBy = parseInt(createdBy);
                    if (isAdmin && selectedDepartment) requestData.departmentId = parseInt(selectedDepartment);
                }
                // assignedTo solo para admins si es ticket nuevo
                if (!isEditing && isAdmin && assignedTo) requestData.assignedTo = parseInt(assignedTo);
                body = JSON.stringify(requestData);
            }

            const response = await fetch(url, { method, headers, body });

            if (!response.ok) {
                const errorData = await response.json();
                let errorMessage = errorData.msg || errorData.message || 'Error al guardar el ticket';
                if (errorData.errors && Array.isArray(errorData.errors)) {
                    errorMessage += '\n' + errorData.errors.map((e: any) => `${e.field}: ${e.message}`).join('\n');
                }
                throw new Error(errorMessage);
            }

            if (isEditing) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                navigate('/dashboard/tickets');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setIsLoading(false);
        }
    };

    const assignedUser = allUsers.find(u => String(u.id) === assignedTo);
    const createdByUser = allUsers.find(u => String(u.id) === createdBy);
    const creatorName = createdByUser?.full_name || creatorInfo?.name || '—';
    const deptName = departments.find(d => String(d.id) === selectedDepartment)?.name || creatorInfo?.department || '—';

    if (!isEditing) {
        // ─── NEW TICKET FORM ────────────────────────────────────────────────────────
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Nuevo Ticket</h1>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow sm:rounded-lg p-6">
                    {error && (
                        <div className="bg-red-50 p-4 rounded-md text-red-700 text-sm">
                            <p className="font-bold">Error:</p>
                            <ul className="list-disc list-inside">
                                {error.split('\n').map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required placeholder="Resumen del problema" />
                    </div>

                    {suggestedArticles.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2">
                            <h4 className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                                <BookOpen className="h-4 w-4" /> Artículos relacionados:
                            </h4>
                            <ul className="text-sm space-y-1">
                                {suggestedArticles.map(article => (
                                    <li key={article.id}>
                                        <a href={`/dashboard/kb/${article.id}`} target="_blank" rel="noreferrer"
                                            className="text-blue-600 hover:underline flex items-center gap-1">
                                            {article.title} <span className="text-xs text-gray-500">({article.category_name})</span>
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <RichEditor value={formData.description}
                            onChange={(v) => setFormData({ ...formData, description: v })}
                            placeholder="Detalles completos del problema..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="department">Departamento <span className="text-red-500">*</span></Label>
                            <select id="department" className={SELECT_CLASS} value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)} required>
                                <option value="">Seleccione un departamento</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="visibility">Visibilidad</Label>
                            <select id="visibility" className={SELECT_CLASS} value={formData.visibility}
                                onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}>
                                <option value="private">Solo para mí (Privado)</option>
                                <option value="department">Para el departamento</option>
                                <option value="public">Todos los usuarios (Público)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority">Prioridad</Label>
                            <select id="priority" className={SELECT_CLASS} value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="file">Adjuntar Archivo (Opcional)</Label>
                        <Input id="file" type="file" onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} className="cursor-pointer" />
                        <p className="text-xs text-gray-500">Soporta imágenes, PDF y Word (Máx 5MB)</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => navigate('/dashboard/tickets')}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Creando...' : 'Crear Ticket'}
                        </Button>
                    </div>
                </form>
            </div>
        );
    }

    // ─── EDIT TICKET — Two column layout ────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">
            {/* ── Top Header Bar ── */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar */}
                            <div className="flex-shrink-0 h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                                {getInitials(creatorName)}
                            </div>
                            <div className="min-w-0">
                                <h1 className="text-lg font-bold text-gray-900 truncate">
                                    {formData.title || 'Cargando...'}
                                </h1>
                                <p className="text-xs text-gray-500">
                                    Solicitado por: <span className="font-medium text-gray-700">{creatorName}</span>
                                    {deptName && deptName !== '—' && (
                                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            {deptName}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {success && (
                                <span className="text-green-600 text-sm font-medium">✓ Guardado</span>
                            )}
                            <Button type="button" variant="outline" onClick={() => navigate('/dashboard/tickets')} className="flex items-center gap-1">
                                <X className="h-4 w-4" /> Cancelar
                            </Button>
                            <Button type="button" onClick={handleSubmit as any} disabled={isLoading} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white">
                                <Save className="h-4 w-4" />
                                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 p-4 rounded-lg text-red-700 text-sm">
                        <p className="font-bold">Error:</p>
                        <ul className="list-disc list-inside">
                            {error.split('\n').map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                    </div>
                )}

                <div className="flex gap-6 items-start">
                    {/* ── LEFT COLUMN (main) ── */}
                    <div className="flex-1 min-w-0 space-y-5">

                        {/* Descripción */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Descripción</h2>
                            <div className="prose prose-sm max-w-none text-gray-700"
                                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formData.description) }} />
                        </div>

                        {/* Atributos del ticket */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Atributos del Ticket</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                {/* Autor */}
                                {isAdmin ? (
                                    <div className="space-y-1">
                                        <Label htmlFor="createdBy" className="text-xs font-medium text-gray-500">Autor</Label>
                                        <select id="createdBy" className={SELECT_CLASS} value={createdBy}
                                            onChange={(e) => setCreatedBy(e.target.value)}>
                                            <option value="">Selecciona el autor</option>
                                            {allUsers.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500">Autor</p>
                                        <p className="text-sm text-gray-900 font-medium">{creatorName}</p>
                                    </div>
                                )}

                                {/* Departamento */}
                                {isAdmin ? (
                                    <div className="space-y-1">
                                        <Label htmlFor="dept" className="text-xs font-medium text-gray-500">Departamento</Label>
                                        <select id="dept" className={SELECT_CLASS} value={selectedDepartment}
                                            onChange={(e) => setSelectedDepartment(e.target.value)}>
                                            <option value="">Seleccione un departamento</option>
                                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-gray-500">Departamento</p>
                                        <p className="text-sm text-gray-900 font-medium">{deptName}</p>
                                    </div>
                                )}

                                {/* Prioridad */}
                                <div className="space-y-1">
                                    <Label htmlFor="priority" className="text-xs font-medium text-gray-500">Prioridad</Label>
                                    <select id="priority" className={SELECT_CLASS} value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}>
                                        <option value="low">Baja</option>
                                        <option value="medium">Media</option>
                                        <option value="high">Alta</option>
                                        <option value="critical">Crítica</option>
                                    </select>
                                </div>

                                {/* Visibilidad */}
                                <div className="space-y-1">
                                    <Label htmlFor="visibility" className="text-xs font-medium text-gray-500">Visibilidad</Label>
                                    <select id="visibility" className={SELECT_CLASS} value={formData.visibility}
                                        onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}>
                                        <option value="private">Solo para mí (Privado)</option>
                                        <option value="department">Para el departamento</option>
                                        <option value="public">Público</option>
                                    </select>
                                </div>

                                {/* Estado */}
                                <div className="space-y-1">
                                    <Label htmlFor="status" className="text-xs font-medium text-gray-500">Estado</Label>
                                    <select id="status" className={SELECT_CLASS} value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="open">Abierto</option>
                                        <option value="in_progress">En Progreso</option>
                                        <option value="waiting">En Espera</option>
                                        <option value="closed">Cerrado</option>
                                    </select>
                                </div>

                                {/* Asignar a Usuario */}
                                {isAdmin && (
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label htmlFor="assignedTo" className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                            <User className="h-3 w-3" /> Asignar a Usuario
                                        </Label>
                                        <select id="assignedTo" className={SELECT_CLASS} value={assignedTo}
                                            onChange={(e) => setAssignedTo(e.target.value)}>
                                            <option value="">Sin asignar</option>
                                            {allUsers.map(u => (
                                                <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Resolution fields (closed tickets, admin) */}
                        {isAdmin && formData.status === 'closed' && (
                            <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-5">
                                <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-4">Parte de Cierre</h2>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <Label htmlFor="resolutionSummary" className="text-xs font-medium text-gray-500">
                                            Diagnóstico / Resumen del Problema <span className="text-red-500">*</span>
                                        </Label>
                                        <Input id="resolutionSummary" value={formData.resolutionSummary}
                                            onChange={(e) => setFormData({ ...formData, resolutionSummary: e.target.value })}
                                            placeholder="¿Qué ocurría realmente?" required={formData.status === 'closed'} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor="resolutionActions" className="text-xs font-medium text-gray-500">
                                            Acciones Realizadas / Solución <span className="text-red-500">*</span>
                                        </Label>
                                        <RichEditor value={formData.resolutionActions}
                                            onChange={(v) => setFormData({ ...formData, resolutionActions: v })}
                                            placeholder="¿Qué se ha hecho para solucionarlo?" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Conversation */}
                        {id && <TicketConversation ticketId={id} />}
                    </div>

                    {/* ── RIGHT COLUMN (quick actions panel) ── */}
                    <div className="w-72 flex-shrink-0 space-y-4">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="flex border-b border-gray-100">
                                <button
                                    onClick={() => setActiveTab('resumen')}
                                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'resumen' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Resumen
                                </button>
                                <button
                                    onClick={() => setActiveTab('relacionados')}
                                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${activeTab === 'relacionados' ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Artículos KB
                                </button>
                            </div>

                            {activeTab === 'resumen' && (
                                <div className="p-4 space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Estado</p>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[formData.status] || 'bg-gray-100 text-gray-700'}`}>
                                            {STATUS_LABELS[formData.status] || formData.status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Prioridad</p>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_COLORS[formData.priority] || 'bg-gray-100 text-gray-700'}`}>
                                            {PRIORITY_LABELS[formData.priority] || formData.priority}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Visibilidad</p>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                            formData.visibility === 'public' ? 'bg-indigo-100 text-indigo-800' :
                                            formData.visibility === 'department' ? 'bg-teal-100 text-teal-800' :
                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                            {formData.visibility === 'public' ? 'Público' : 
                                             formData.visibility === 'department' ? 'Departamento' : 'Privado'}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Autor</p>
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                {getInitials(creatorName)}
                                            </div>
                                            <span className="text-sm text-gray-700 truncate">{creatorName}</span>
                                        </div>
                                    </div>
                                    {assignedUser && (
                                        <div>
                                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Asignado a</p>
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                    {getInitials(assignedUser.full_name)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-gray-700 truncate">{assignedUser.full_name}</p>
                                                    <p className="text-xs text-gray-400 truncate">{assignedUser.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Departamento</p>
                                        <p className="text-sm text-gray-700">{deptName}</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'relacionados' && (
                                <div className="p-4">
                                    {suggestedArticles.length > 0 ? (
                                        <ul className="space-y-2">
                                            {suggestedArticles.map(article => (
                                                <li key={article.id}>
                                                    <a href={`/dashboard/kb/${article.id}`} target="_blank" rel="noreferrer"
                                                        className="flex items-start gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline">
                                                        <BookOpen className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                                        <span>{article.title}</span>
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-xs text-gray-400 text-center py-4">No hay artículos relacionados</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Ticket #ID badge */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Ticket ID</p>
                            <p className="text-2xl font-bold text-gray-800">#{id}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
