import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { API_ENDPOINTS } from '@/config/api';
import { RichEditor } from '@/components/RichEditor';
import DOMPurify from 'dompurify';

interface Comment {
    id: number;
    content: string;
    created_at: string;
    full_name: string;
    role: string;
}

interface Attachment {
    id: number;
    file_name: string;
    file_path: string;
    created_at: string;
    uploaded_by: number;
}

interface TicketConversationProps {
    ticketId: string;
}

export function TicketConversation({ ticketId }: TicketConversationProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchComments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_ENDPOINTS.TICKETS.BASE}/${ticketId}/comments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                // Sort by date descending (Newest first)
                const sortedComments = data.comments.sort((a: Comment, b: Comment) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                setComments(sortedComments);
                setAttachments(data.attachments);
            }
        } catch (error) {
            console.error('Error fetching comments', error);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [ticketId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment && !file) return;

        setIsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('content', newComment);
            if (file) {
                formData.append('file', file);
            }

            const response = await fetch(`${API_ENDPOINTS.TICKETS.BASE}/${ticketId}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                setNewComment('');
                setFile(null);
                fetchComments(); // Recargar comentarios

                // Reset file input manually if needed using ref, simpler here
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            }
        } catch (error) {
            console.error('Error adding comment', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getFileUrl = (path: string) => {
        const filename = path.split(/[/\\]/).pop();
        return `/uploads/${filename}`;
    };

    return (
        <div className="my-8 border-t pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Conversación y Archivos</h3>

            {/* Formulario al principio */}
            <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 mb-8 shadow-sm">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Comentario</label>
                        <RichEditor
                            value={newComment}
                            onChange={setNewComment}
                            placeholder="Escribe tu mensaje aquí..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Adjuntar Archivo (Opcional)</label>
                        <Input
                            id="file-upload"
                            type="file"
                            onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading || (!newComment && !file)}>
                            {isLoading ? 'Enviando...' : 'Enviar Mensaje'}
                        </Button>
                    </div>
                </div>
            </form>

            {/* Lista de Comentarios y Archivos debajo */}
            <div className="space-y-6">
                {comments.length === 0 ? (
                    <p className="text-gray-500 text-sm">No hay comentarios aún.</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="font-medium text-gray-900">{comment.full_name}</span>
                                    <span className="text-xs text-gray-500 ml-2">
                                        ({comment.role === 'admin' ? 'Admin' : comment.role === 'agent' ? 'Agente' : 'Usuario'})
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {new Date(comment.created_at).toLocaleString()}
                                </span>
                            </div>
                            <div className="mt-2 text-gray-700">
                                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(comment.content) }} />
                            </div>
                        </div>
                    ))
                )}

                {/* Lista separada de adjuntos */}
                {attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Archivos Adjuntos (Todos)</h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {attachments.map(att => (
                                <li key={att.id} className="border rounded p-3 flex items-center justify-between bg-white">
                                    <div className="flex items-center overflow-hidden">
                                        <span className="text-sm text-gray-600 truncate">{att.file_name}</span>
                                    </div>
                                    <a
                                        href={getFileUrl(att.file_path)}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 text-sm ml-2"
                                    >
                                        Descargar
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
