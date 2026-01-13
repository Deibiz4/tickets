import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';

interface Ticket {
    id: number;
    title: string;
    status: 'open' | 'in_progress' | 'waiting' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    created_at: string;
}

interface DashboardChartsProps {
    tickets: Ticket[];
}

const STATUS_COLORS = {
    open: '#22c55e',       // green-500
    in_progress: '#eab308', // yellow-500
    waiting: '#f97316',    // orange-500
    closed: '#6b7280',     // gray-500
};

const PRIORITY_COLORS = {
    low: '#3b82f6',        // blue-500
    medium: '#eab308',     // yellow-500
    high: '#ef4444',       // red-500
    critical: '#991b1b',   // red-800
};



const PRIORITY_LABELS = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica',
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ tickets }) => {
    // Process data for charts
    const statusData = [
        { name: 'Abierto', value: tickets.filter(t => t.status === 'open').length, fill: STATUS_COLORS.open },
        { name: 'En Progreso', value: tickets.filter(t => t.status === 'in_progress').length, fill: STATUS_COLORS.in_progress },
        { name: 'En Espera', value: tickets.filter(t => t.status === 'waiting').length, fill: STATUS_COLORS.waiting },
        { name: 'Cerrado', value: tickets.filter(t => t.status === 'closed').length, fill: STATUS_COLORS.closed },
    ];

    const priorityData = [
        { name: 'Baja', value: tickets.filter(t => t.priority === 'low').length },
        { name: 'Media', value: tickets.filter(t => t.priority === 'medium').length },
        { name: 'Alta', value: tickets.filter(t => t.priority === 'high').length },
        { name: 'Crítica', value: tickets.filter(t => t.priority === 'critical').length },
    ];

    // Filter out zero values for visual cleanliness if desired, or keep them to show 0

    const activePriorityData = priorityData.filter(d => d.value > 0);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Status Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Estado de los Tickets</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={statusData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="value" name="Cantidad" radius={[4, 4, 0, 0]}>
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Priority Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Distribución por Prioridad</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={activePriorityData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {activePriorityData.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={Object.values(PRIORITY_COLORS)[Object.keys(PRIORITY_LABELS).findIndex(key => PRIORITY_LABELS[key as keyof typeof PRIORITY_LABELS] === entry.name)]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
