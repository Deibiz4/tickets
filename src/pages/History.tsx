import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/context/AuthContext';

interface Ticket {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    created_at: string;
    creator_username: string;
    creator_full_name: string;
    creator_department: string | null;
}

export function History() {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtros
    const [selectedDept, setSelectedDept] = useState<string>('all');
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        const fetchTickets = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(API_ENDPOINTS.TICKETS.BASE, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Error al cargar los tickets');
                }

                const data: Ticket[] = await response.json();

                // Filtrar solo tickets cerrados y ordenarlos por fecha descendente
                const closedTickets = data.filter(t => t.status === 'closed').sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );

                setTickets(closedTickets);
                setFilteredTickets(closedTickets);

                // Extraer departamentos únicos
                const depts = Array.from(new Set(
                    closedTickets
                        .map(t => t.creator_department)
                        .filter((d): d is string => !!d) // Filtrar nulos
                )).sort();
                setDepartments(depts);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error desconocido');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTickets();
    }, []);

    // Efecto para filtrar cuando cambia la selección
    useEffect(() => {
        if (selectedDept === 'all') {
            setFilteredTickets(tickets);
        } else {
            setFilteredTickets(tickets.filter(t => t.creator_department === selectedDept));
        }
    }, [selectedDept, tickets]);

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-600 font-bold';
            case 'critical': return 'text-red-800 font-extrabold';
            case 'medium': return 'text-yellow-600 font-medium';
            case 'low': return 'text-blue-600';
            default: return 'text-gray-600';
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Historial de Incidencias</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Repositorio de incidencias cerradas, organizadas por departamento.
                    </p>
                </div>
            </div>

            {/* Filtros */}
            <div className="mt-4 flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm border">
                <label htmlFor="dept-filter" className="text-sm font-medium text-gray-700">Filtrar por Departamento:</label>
                <select
                    id="dept-filter"
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="mt-1 block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                >
                    <option value="all">Todos los Departamentos</option>
                    {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
                <span className="text-sm text-gray-500">
                    Mostrando {filteredTickets.length} resultados
                </span>
            </div>

            {error && (
                <div className="mt-4 bg-red-50 p-4 rounded-md">
                    <div className="text-red-700">{error}</div>
                </div>
            )}

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">ID</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Título</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Departamento</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Solicitante</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Prioridad</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Fecha Cierre</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Ver</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {filteredTickets.map((ticket) => (
                                        <tr key={ticket.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                #{ticket.id}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {ticket.title}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {ticket.creator_department ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {ticket.creator_department}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic">N/A</span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {ticket.creator_full_name || ticket.creator_username}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                <span className={getPriorityColor(ticket.priority)}>
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {new Date(ticket.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <Link to={`/dashboard/tickets/${ticket.id}`} className="text-blue-600 hover:text-blue-900">
                                                    Ver Detalles
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredTickets.length === 0 && !error && (
                                <div className="text-center py-8 text-gray-500">
                                    {selectedDept === 'all'
                                        ? 'No hay tickets cerrados en el historial.'
                                        : `No hay tickets cerrados para el departamento "${selectedDept}".`}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
