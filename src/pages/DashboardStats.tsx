import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { Loader2, TrendingUp, Users, CheckCircle, Clock, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardStatsData {
    counts: {
        total: number;
        open: number;
        in_progress: number;
        waiting: number;
        closed: number;
    };
    byPriority: { priority: string; count: string }[];
    byStatus: { status: string; count: string }[];
    trend: { date: string; count: string }[];
    topUsers: { id: number; username: string; full_name: string; ticket_count: string }[];
    avgResolutionHours: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function DashboardStats() {
    const { token, isLoading } = useAuth();
    const [stats, setStats] = useState<DashboardStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (token) {
            fetchStats();
        } else if (!loading) {
            // If not loading and no token, redirect or handle error (though ProtectedRoute handles redirect)
        }
    }, [token]);

    const fetchStats = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.STATS.BASE, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error fetching stats');
            const data = await response.json();
            setStats(data);
        } catch (err) {
            console.error('Error:', err);
            setError('No se pudieron cargar las estadísticas.');
        } finally {
            setLoading(false);
        }
    };

    const downloadCSV = () => {
        if (!stats) return;

        const csvRows = [];

        // Header
        csvRows.push(['Dashboard Export', new Date().toLocaleDateString()]);
        csvRows.push([]);

        // Summary
        csvRows.push(['Resumen Global']);
        csvRows.push(['Total', stats.counts.total]);
        csvRows.push(['Abiertos', stats.counts.open]);
        csvRows.push(['En Progreso', stats.counts.in_progress]);
        csvRows.push(['En Espera', stats.counts.waiting]);
        csvRows.push(['Cerrados', stats.counts.closed]);
        csvRows.push(['Tiempo Medio Resolucion (h)', stats.counts.avgResolutionHours]);
        csvRows.push([]);

        // Top Users
        csvRows.push(['Usuarios Mas Activos']);
        csvRows.push(['Usuario', 'Nombre', 'Tickets Creados']);
        stats.topUsers.forEach(user => {
            csvRows.push([user.username, user.full_name, user.ticket_count]);
        });

        // Convert to CSV string safely handling commas
        const csvContent = csvRows.map(e => e.map(item => {
            if (typeof item === 'string' && item.includes(',')) {
                return `"${item}"`; // Quote strings with commas
            }
            return item;
        }).join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `dashboard_stats_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 text-center">{error}</div>;
    }

    if (!stats) return null;

    // Transform string counts to numbers for Recharts
    const trendData = stats.trend.map(item => ({ ...item, count: parseInt(item.count) }));
    const priorityData = stats.byPriority.map(item => ({ name: item.priority, value: parseInt(item.count) }));
    const statusData = stats.byStatus.map(item => ({ name: item.status, value: parseInt(item.count) }));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard de Métricas</h1>
                <Button onClick={downloadCSV} variant="outline" className="flex gap-2">
                    <Download className="h-4 w-4" />
                    Exportar CSV
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tickets Totales</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.counts.total}</div>
                        <p className="text-xs text-muted-foreground">tickets en el sistema</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Abiertos</CardTitle>
                        <div className="h-4 w-4 text-green-500 rounded-full bg-green-100 flex items-center justify-center p-0.5" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.counts.open}</div>
                        <p className="text-xs text-muted-foreground">pendientes de atención</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cerrados</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.counts.closed}</div>
                        <p className="text-xs text-muted-foreground">tickets resueltos</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tiempo Medio Resolución</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgResolutionHours}h</div>
                        <p className="text-xs text-muted-foreground">promedio histórico</p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Tendencia (últimos 7 días)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <RechartsTooltip />
                                <Legend />
                                <Line type="monotone" dataKey="count" stroke="#8884d8" name="Tickets Creados" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Por Estado</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row 2 & Top Users */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="col-span-1 lg:col-span-1">
                    <CardHeader>
                        <CardTitle>Por Prioridad</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={priorityData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="value" fill="#82ca9d" name="Cantidad" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Usuarios Más Activos</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3">Usuario</th>
                                        <th className="px-6 py-3">Nombre Completo</th>
                                        <th className="px-6 py-3 text-right">Tickets Creados</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.topUsers.map((user) => (
                                        <tr key={user.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                        {user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    {user.username}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{user.full_name}</td>
                                            <td className="px-6 py-4 text-right font-bold">{user.ticket_count}</td>
                                        </tr>
                                    ))}
                                    {stats.topUsers.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                                                No hay datos disponibles
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
