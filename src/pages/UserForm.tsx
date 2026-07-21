import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { API_ENDPOINTS } from '@/config/api';

export function UserForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isEditing = !!id;

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: '',
        departmentId: '' as string | number,
        phone: '',
        role: 'user'
    });

    const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await fetch(API_ENDPOINTS.DEPARTMENTS.BASE);
                if (response.ok) {
                    const data = await response.json();
                    setDepartments(data);
                }
            } catch (error) {
                console.error('Error fetching departments:', error);
            }
        };

        fetchDepartments();
    }, []);

    useEffect(() => {
        if (isEditing) {
            const fetchUser = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(API_ENDPOINTS.USERS.BY_ID(id!), {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) throw new Error('Error al cargar el usuario');

                    const data = await response.json();
                    setFormData({
                        username: data.username,
                        email: data.email,
                        password: '',
                        fullName: data.full_name || data.fullName,
                        departmentId: data.department_id || '',
                        phone: data.phone_number || data.phone || '',
                        role: data.role
                    });
                } catch (err) {
                    setError('No se pudo cargar el usuario');
                }
            };
            fetchUser();
        }
    }, [id, isEditing]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            const url = isEditing
                ? API_ENDPOINTS.USERS.BY_ID(id!)
                : API_ENDPOINTS.USERS.BASE;

            const method = isEditing ? 'PUT' : 'POST';

            // Filter out empty password if editing
            const payload = { ...formData };
            if (isEditing && !payload.password) {
                delete (payload as any).password;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.msg || errorData.message || 'Error al guardar el usuario');
            }

            navigate('/dashboard/users');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al guardar');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="md:flex md:items-center md:justify-between mb-8">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow sm:rounded-lg p-6">
                {error && (
                    <div className="bg-red-50 p-4 rounded-md text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="username">Nombre de Usuario</Label>
                    <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        required
                        placeholder="Ej: jdoe"
                        disabled={isEditing} // Often username is immutable, but our backend allows update if check passes. Let's keep it editable but careful. Actually backend checks for conflict. Let's allow edit.
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre Completo</Label>
                    <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                        placeholder="Ej: John Doe"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="department">Departamento</Label>
                    <select
                        id="department"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.departmentId}
                        onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                        required
                    >
                        <option value="">Selecciona un departamento</option>
                        {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                                {dept.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono (Opcional)</Label>
                    <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Ej: 600123456"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        placeholder="Ej: jdoe@example.com"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="password">Contraseña {isEditing && '(Dejar en blanco para mantener actual)'}</Label>
                    <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required={!isEditing}
                        placeholder={isEditing ? "********" : "Contraseña segura"}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <select
                        id="role"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                        <option value="user">Usuario</option>
                        <option value="agent">Agente</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate('/dashboard/users')}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Usuario')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
