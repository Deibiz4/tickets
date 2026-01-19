import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { API_ENDPOINTS } from '@/config/api';

interface NotificationSetting {
    id: number;
    event_type: string;
    enabled: boolean;
    recipients_role: string;
    description: string;
    updated_at: string;
}

interface SettingsFormData {
    fullName: string;
    email: string;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
}

function NotificationSettingsPanel() {
    const [settings, setSettings] = useState<NotificationSetting[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            fetchSettings();
        };
        checkAdmin();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.SETTINGS, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
                setIsAdmin(true);
            } else {
                if (response.status === 403 || response.status === 401) {
                    setIsAdmin(false);
                }
            }
        } catch (error) {
            console.error('Error fetching settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (eventType: string, currentEnabled: boolean) => {
        // Optimistic update
        setSettings((prev: NotificationSetting[]) => prev.map((s: NotificationSetting) => s.event_type === eventType ? { ...s, enabled: !currentEnabled } : s));

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(API_ENDPOINTS.NOTIFICATIONS.UPDATE(eventType), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ enabled: !currentEnabled })
            });

            if (!response.ok) {
                // Revert
                setSettings((prev: NotificationSetting[]) => prev.map((s: NotificationSetting) => s.event_type === eventType ? { ...s, enabled: currentEnabled } : s));
            }
        } catch (error) {
            // Revert
            setSettings((prev: NotificationSetting[]) => prev.map((s: NotificationSetting) => s.event_type === eventType ? { ...s, enabled: currentEnabled } : s));
        }
    };

    if (!isAdmin) return null;

    if (loading) return <div className="mt-8">Cargando configuraciones...</div>;

    return (
        <div className="mt-8 mb-8 bg-white shadow sm:rounded-lg p-6">
            <div className="mb-6">
                <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Configuración de Notificaciones (Admin)</h2>
                <p className="text-xs text-gray-500 mt-1">Controla qué eventos envían correos electrónicos.</p>
            </div>

            <div className="space-y-6">
                {settings.map((setting) => (
                    <div key={setting.event_type} className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">{setting.description || setting.event_type}</Label>
                            <p className="text-sm text-gray-500">
                                {setting.recipients_role === 'all' ? 'Se notifica a todos los involucrados' : `Se notifica a: ${setting.recipients_role}`}
                            </p>
                        </div>
                        <Switch
                            checked={setting.enabled}
                            onCheckedChange={() => handleToggle(setting.event_type, setting.enabled)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function Settings() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState<SettingsFormData>({
        fullName: '',
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        // Cargar datos del usuario actual
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setFormData((prev: SettingsFormData) => ({
                        ...prev,
                        fullName: data.user.fullName || data.user.full_name,
                        email: data.user.email
                    }));
                }
            } catch (error) {
                console.error('Error loading profile', error);
            }
        };
        fetchProfile();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'las nuevas contraseñas no coinciden' });
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('token');
            const payload: any = {
                fullName: formData.fullName,
                email: formData.email
            };

            if (formData.currentPassword && formData.newPassword) {
                payload.currentPassword = formData.currentPassword;
                payload.newPassword = formData.newPassword;
            }

            const response = await fetch(API_ENDPOINTS.AUTH.PROFILE, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.msg || 'Error al actualizar perfil');
            }

            setMessage({ type: 'success', text: 'Perfil actualizado correctamente' });

            // Limpiar campos de contraseña
            setFormData((prev: SettingsFormData) => ({
                ...prev,
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            }));

        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error al guardar' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Configuración de Perfil</h1>
                <p className="text-gray-500 mt-1">Actualiza tu información personal y contraseña.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow sm:rounded-lg p-6">
                {message && (
                    <div className={`p-4 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}

                <div className="space-y-4">
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Información Básica</h2>

                    <div className="space-y-2">
                        <Label htmlFor="fullName">Nombre Completo</Label>
                        <Input
                            id="fullName"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required
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
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-4">
                    <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Cambiar Contraseña</h2>
                    <p className="text-xs text-gray-500">Deja estos campos vacíos si no deseas cambiar tu contraseña.</p>

                    <div className="space-y-2">
                        <Label htmlFor="currentPassword">Contraseña Actual</Label>
                        <Input
                            id="currentPassword"
                            type="password"
                            value={formData.currentPassword}
                            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">Nueva Contraseña</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                value={formData.newPassword}
                                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>

            <NotificationSettingsPanel />
        </div>
    );
}

// Default export because lazy loading in App.tsx might expect it?
// No, App.tsx uses named import { Settings } from '@/pages/Settings';
// However, I should check if I should do a default export as well just in case.
// App.tsx source: import { Settings } from '@/pages/Settings';
