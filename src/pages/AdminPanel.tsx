import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS } from '@/config/api';
import { Shield, UserCog, Building2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface User {
    id: number;
    username: string;
    email: string;
    full_name: string;
    role: string;
    department_id: number | null;
    department_name: string | null;
    is_super_admin: boolean;
    phone_number: string | null;
}

interface Department {
    id: number;
    name: string;
}

export function AdminPanel() {
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { token } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const usersRes = await fetch(API_ENDPOINTS.ADMIN.USERS, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const deptsRes = await fetch(API_ENDPOINTS.DEPARTMENTS.BASE, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (usersRes.ok && deptsRes.ok) {
                const usersData = await usersRes.json();
                const deptsData = await deptsRes.json();
                setUsers(usersData);
                setDepartments(deptsData);
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
            toast({
                title: "Error",
                description: "No se pudieron cargar los datos de administración",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        try {
            const response = await fetch(API_ENDPOINTS.ADMIN.USER_BY_ID(editingUser.id.toString()), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    role: editingUser.role,
                    departmentId: editingUser.department_id,
                    is_super_admin: editingUser.is_super_admin
                })
            });

            if (response.ok) {
                toast({
                    title: "Éxito",
                    description: `Usuario ${editingUser.username} actualizado correctamente`,
                });
                setEditingUser(null);
                fetchData();
            } else {
                throw new Error('Error al actualizar');
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "No se pudo actualizar el usuario",
                variant: "destructive",
            });
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Administración del Sistema</h1>
                    <p className="text-gray-500">
                        Gestión de usuarios, roles y permisos globales de la plataforma.
                    </p>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Departamento</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Privilegios</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((u) => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <div className="text-sm font-medium text-gray-900">{u.full_name}</div>
                                            <div className="text-xs text-gray-500">@{u.username}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-gray-400" />
                                            {u.department_name || 'Sin asignar'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                u.role === 'agent' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {u.role.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {u.is_super_admin && (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                                <Shield className="h-3 w-3" />
                                                Súper Admin
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => setEditingUser(u)}
                                            className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                                        >
                                            <UserCog className="h-4 w-4 mr-1" />
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de edición (Simple implementation) */}
            {editingUser && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setEditingUser(null)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-middle bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div className="absolute top-0 right-0 pt-4 pr-4">
                                <button
                                    type="button"
                                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                                    onClick={() => setEditingUser(null)}
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div>
                                <div className="mt-3 text-center sm:mt-5">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        Editar Permisos: {editingUser.full_name}
                                    </h3>
                                    <div className="mt-6 text-left space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Rol</label>
                                            <select
                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                                value={editingUser.role}
                                                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                            >
                                                <option value="user">Usuario</option>
                                                <option value="agent">Agente</option>
                                                <option value="admin">Administrador</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Departamento</label>
                                            <select
                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                                value={editingUser.department_id?.toString() || "none"}
                                                onChange={(e) => setEditingUser({ ...editingUser, department_id: e.target.value === "none" ? null : parseInt(e.target.value) })}
                                            >
                                                <option value="none">Sin asignar</option>
                                                {departments.map((d) => (
                                                    <option key={d.id} value={d.id.toString()}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-start">
                                            <div className="flex items-center h-5">
                                                <input
                                                    id="is_super_admin"
                                                    type="checkbox"
                                                    checked={editingUser.is_super_admin}
                                                    onChange={(e) => setEditingUser({ ...editingUser, is_super_admin: e.target.checked })}
                                                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                                />
                                            </div>
                                            <div className="ml-3 text-sm">
                                                <label htmlFor="is_super_admin" className="font-medium text-gray-700">Privilegios de Súper Administrador</label>
                                                <p className="text-gray-500 text-xs">Permite gestionar todos los departamentos y la configuración global.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 sm:mt-8 flex gap-3 flex-row-reverse">
                                <Button onClick={handleUpdateUser}>Guardar cambios</Button>
                                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
