import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS } from '@/config/api';
import { DashboardCharts } from '@/components/DashboardCharts';

interface Ticket {
    id: number;
    title: string;
    status: 'open' | 'in_progress' | 'waiting' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    created_at: string;
    creator_username: string;
}

export function DashboardHome() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(API_ENDPOINTS.TICKETS.BASE, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setTickets(data);
                }
            } catch (error) {
                console.error('Error fetching tickets', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTickets();
    }, []);

    const recentTickets = tickets
        .filter(t => t.status !== 'closed')
        .slice(0, 5); // Show only 5 most recent active tickets

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-green-100 text-green-800';
            case 'in_progress': return 'bg-yellow-100 text-yellow-800';
            case 'closed': return 'bg-gray-100 text-gray-800';
            case 'waiting': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'open': return 'Abierto';
            case 'in_progress': return 'En Progreso';
            case 'closed': return 'Cerrado';
            case 'waiting': return 'En Espera';
            default: return status;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-600 font-bold bg-red-50';
            case 'critical': return 'text-red-800 font-extrabold bg-red-100';
            case 'medium': return 'text-yellow-600 font-medium bg-yellow-50';
            case 'low': return 'text-blue-600 bg-blue-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'low': return 'Baja';
            case 'medium': return 'Media';
            case 'high': return 'Alta';
            case 'critical': return 'Crítica';
            default: return priority;
        }
    };

    return (
        <div className="bg-gray-50/50 p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Panel de Control</h2>

            {/* Gráficos de Estadísticas */}
            {isLoading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
            ) : (
                <DashboardCharts tickets={tickets} />
            )}

            {/* Sección de tickets recientes */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Tickets Recientes</h3>
                    <Button asChild>
                        <Link to="/dashboard/tickets/new">Nuevo Ticket</Link>
                    </Button>
                </div>
                <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-100">
                    {isLoading ? (
                        <div className="p-4 text-center text-gray-500">Cargando tickets...</div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {recentTickets.length === 0 ? (
                                <li className="px-4 py-8 text-center text-gray-500">No hay tickets recientes</li>
                            ) : (
                                recentTickets.map((ticket) => (
                                    <li key={ticket.id}>
                                        <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <Link to={`/dashboard/tickets/${ticket.id}`} className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-blue-600 truncate hover:underline">
                                                        Ticket #{ticket.id} - {ticket.title}
                                                    </p>
                                                </Link>
                                                <div className="ml-2 flex-shrink-0 flex">
                                                    <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                                                        {getStatusLabel(ticket.status)}
                                                    </p>
                                                    <p className={`ml-2 px-2 inline-flex text-xs leading-5 rounded-full ${getPriorityColor(ticket.priority)}`}>
                                                        {getPriorityLabel(ticket.priority)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="mt-2 sm:flex sm:justify-between">
                                                <div className="sm:flex">
                                                    <p className="flex items-center text-sm text-gray-500">
                                                        Created {new Date(ticket.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                                    by {ticket.creator_username}
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                ))
                            )}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
