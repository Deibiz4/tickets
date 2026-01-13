import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function GlobalSearch() {
    const [query, setQuery] = useState('');
    const navigate = useNavigate();

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (query.trim()) {
            navigate(`/dashboard/tickets?search=${encodeURIComponent(query.trim())}`);
        } else {
            navigate('/dashboard/tickets');
        }
    };

    return (
        <form onSubmit={handleSearch} className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
                type="search"
                placeholder="Buscar tickets..."
                className="pl-9 w-full bg-white/50 focus:bg-white transition-colors"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
        </form>
    );
}
