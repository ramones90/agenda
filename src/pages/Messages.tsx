import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../lib/api';
import { Send, User } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export default function Messages() {
  const { user } = useAuthStore();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch contacts
    apiFetch(`/api/contacts?userId=${user?.id}&role=${user?.role}`)
      .then(res => res.json())
      .then(setContacts);

    // Socket connection
    const newSocket = io('/');
    setSocket(newSocket);
    
    if (user) {
      newSocket.emit('join-room', user.id, user.id); // Join own room for notifications
    }

    newSocket.on('receive-message', (message) => {
      if (selectedContact && (message.sender_id === selectedContact.id || message.sender_id === user?.id)) {
        setMessages(prev => [...prev, message]);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, selectedContact]);

  useEffect(() => {
    if (selectedContact && user) {
      apiFetch(`/api/messages?userId=${user.id}&contactId=${selectedContact.id}`)
        .then(res => res.json())
        .then(setMessages);
    }
  }, [selectedContact, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact || !user) return;

    const message = {
      senderId: user.id,
      receiverId: selectedContact.id,
      content: newMessage
    };

    const res = await apiFetch('/api/messages', {
      method: 'POST',
      body: JSON.stringify(message),
    });
    
    const savedMessage = await res.json();
    setMessages(prev => [...prev, savedMessage]);
    setNewMessage('');
  };

  return (
    <div className="h-[calc(100vh-6rem)] bg-white rounded-[3rem] shadow-sm border border-stone-100 flex overflow-hidden max-w-7xl mx-auto">
      {/* Contacts List */}
      <div className="w-96 border-r border-stone-100 flex flex-col bg-stone-50/30">
        <div className="p-8 border-b border-stone-100 bg-white/50 backdrop-blur-sm">
          <h2 className="text-2xl font-serif italic text-stone-900 tracking-tight">Mensagens</h2>
          <p className="text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em] mt-1">Conversas Recentes</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {contacts.map((contact: any) => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`w-full p-5 flex items-center gap-4 rounded-[2rem] transition-all group ${
                selectedContact?.id === contact.id 
                  ? 'bg-stone-900 text-white shadow-xl shadow-stone-200' 
                  : 'hover:bg-white hover:shadow-sm text-stone-600'
              }`}
            >
              <div className="relative">
                <img 
                  src={contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}`} 
                  alt="" 
                  className={`w-14 h-14 rounded-2xl object-cover border-2 ${selectedContact?.id === contact.id ? 'border-stone-700' : 'border-white'}`} 
                  referrerPolicy="no-referrer" 
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className={`text-lg font-serif italic truncate ${selectedContact?.id === contact.id ? 'text-white' : 'text-stone-900'}`}>
                  {contact.name}
                </p>
                <p className={`text-[10px] font-bold uppercase tracking-widest truncate ${selectedContact?.id === contact.id ? 'text-stone-400' : 'text-stone-400'}`}>
                  {contact.email}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedContact ? (
          <>
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                <img 
                  src={selectedContact.avatar || `https://ui-avatars.com/api/?name=${selectedContact.name}`} 
                  alt="" 
                  className="w-12 h-12 rounded-2xl object-cover border border-stone-100" 
                  referrerPolicy="no-referrer" 
                />
                <div>
                  <p className="text-xl font-serif italic text-stone-900">{selectedContact.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    Online agora
                  </div>
                </div>
              </div>
              <button className="p-3 hover:bg-stone-50 rounded-2xl text-stone-400 hover:text-stone-600 transition-all border border-transparent hover:border-stone-100">
                <User className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-stone-50/30 custom-scrollbar">
              {messages.map((msg, index) => {
                const isOwn = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[75%]`}>
                      <div
                        className={`p-5 rounded-[2rem] text-lg font-serif italic leading-relaxed shadow-sm ${
                          isOwn
                            ? 'bg-stone-900 text-white rounded-tr-none'
                            : 'bg-white border border-stone-100 text-stone-800 rounded-tl-none'
                        }`}
                      >
                        <p>{msg.content}</p>
                      </div>
                      <p className={`text-[10px] mt-2 font-bold uppercase tracking-widest ${isOwn ? 'text-stone-400' : 'text-stone-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 bg-white border-t border-stone-100">
              <form onSubmit={handleSendMessage} className="flex gap-4 items-center bg-stone-50 p-2 rounded-[2.5rem] border border-stone-100 focus-within:border-stone-200 focus-within:ring-4 focus-within:ring-stone-100 transition-all">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escreva sua mensagem com calma..."
                  className="flex-1 px-6 py-4 bg-transparent outline-none font-serif italic text-lg text-stone-800 placeholder:text-stone-300"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-4 bg-stone-900 text-white rounded-[2rem] hover:bg-stone-800 disabled:opacity-50 transition-all shadow-lg shadow-stone-200"
                >
                  <Send className="w-6 h-6" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400 p-12 text-center">
            <div className="w-24 h-24 bg-stone-50 rounded-[2.5rem] flex items-center justify-center mb-8 border border-stone-100 shadow-sm">
              <User className="w-12 h-12 text-stone-200" />
            </div>
            <h3 className="text-3xl font-serif italic text-stone-900 mb-4">Escolha uma conversa</h3>
            <p className="text-stone-400 font-serif italic text-xl max-w-sm">
              Selecione um contato ao lado para iniciar um diálogo acolhedor e seguro.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
