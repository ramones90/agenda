import React, { useRef, useState, useEffect } from 'react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, Layout, Loader2, Send, 
  User, Shield, Monitor, X, CheckCircle2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth';
import SimplePeer from 'simple-peer';

// Fix for simple-peer in Vite
const Peer = (SimplePeer as any).default || SimplePeer;

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface Message {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

export default function VideoRoom() {
  const { id: roomId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<any>(null);
  const peerRef = useRef<any>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [participantJoined, setParticipantJoined] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [role, setRole] = useState<'patient' | 'psychologist' | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [mediaError, setMediaError] = useState<string | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Validate Room Access
  useEffect(() => {
    const validateRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}/validate?userId=${user?.id}`);
        const data = await res.json();
        if (data.authorized) {
          setIsAuthorized(true);
          setRole(data.role);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        setIsAuthorized(false);
      }
    };
    if (user && roomId) validateRoom();
  }, [roomId, user]);

  // Initialize Media and Socket
  useEffect(() => {
    if (!isAuthorized || !roomId || !user) return;

    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global error caught in VideoRoom:', event.error);
    };
    window.addEventListener('error', handleGlobalError);

    if (typeof Buffer === 'undefined') {
      console.error('CRITICAL: Buffer is not defined! simple-peer will likely fail.');
    }
    console.log('Peer constructor type:', typeof Peer);

    const newSocket = io('/', { transports: ['websocket'] });
    setSocket(newSocket);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        console.log('Local stream obtained');
        setLocalStream(stream);
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        
        // If we already have a peer but it was created without a stream, add it now
        if (peerRef.current && !peerRef.current.streams.includes(stream)) {
          console.log('Adding stream to existing peer');
          try {
            peerRef.current.addStream(stream);
          } catch (err) {
            console.error('Error adding stream to peer:', err);
          }
        }
        
        newSocket.emit('join-room', roomId, user.id, role);
      })
      .catch(err => {
        console.error('Media access error:', err);
        let errorMsg = 'Erro ao acessar câmera ou microfone.';
        if (err.name === 'NotAllowedError') {
          errorMsg = 'Permissão negada para acessar câmera/microfone. Por favor, verifique as configurações do seu navegador e se está usando HTTPS.';
        } else if (err.name === 'NotFoundError') {
          errorMsg = 'Câmera ou microfone não encontrados.';
        }
        setMediaError(errorMsg);
      });

    newSocket.on('room-status', ({ isOtherPresent }) => {
      setParticipantJoined(isOtherPresent);
      if (isOtherPresent) {
        setMessages(prev => [...prev, {
          senderId: 'system',
          senderName: 'Sistema',
          content: 'O outro participante já está na sala. Conectando vídeo...',
          timestamp: new Date().toISOString()
        }]);
      }
    });

    newSocket.on('user-connected', ({ userId, socketId }) => {
      console.log('User connected:', userId, 'with socketId:', socketId);
      setParticipantJoined(true);
      setMessages(prev => [...prev, {
        senderId: 'system',
        senderName: 'Sistema',
        content: 'O outro participante entrou na sala. Conectando vídeo...',
        timestamp: new Date().toISOString()
      }]);
      initiatePeer(true, socketId, newSocket);
    });

    newSocket.on('signal', ({ signal, socketId }) => {
      console.log('Received signal from:', socketId, 'type:', signal.type || 'candidate');
      if (peerRef.current) {
        console.log('Applying signal to existing peer');
        try {
          peerRef.current.signal(signal);
        } catch (err) {
          console.error('Error signaling existing peer:', err);
        }
      } else {
        console.log('Creating new peer for received signal');
        const p = initiatePeer(false, socketId, newSocket);
        try {
          p.signal(signal);
        } catch (err) {
          console.error('Error signaling new peer:', err);
        }
      }
    });

    newSocket.on('receive-chat-message', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('user-disconnected', () => {
      setIsConnected(false);
      setParticipantJoined(false);
      setRemoteStream(null);
      setMessages(prev => [...prev, {
        senderId: 'system',
        senderName: 'Sistema',
        content: 'O outro participante saiu da sala.',
        timestamp: new Date().toISOString()
      }]);
      if (peerRef.current) peerRef.current.destroy();
      setPeer(null);
      peerRef.current = null;
    });

    return () => {
      newSocket.disconnect();
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [isAuthorized, roomId, user]);

  const initiatePeer = (initiator: boolean, targetSocketId: string, currentSocket: Socket) => {
    console.log('Initiating peer, initiator:', initiator, 'target:', targetSocketId);
    
    // If we already have a peer, destroy it before creating a new one
    if (peerRef.current) {
      console.log('Destroying existing peer before creating new one');
      peerRef.current.destroy();
    }

    // Ensure we have a stream
    if (!streamRef.current) {
      console.warn('No local stream available for peer connection, will try to connect without stream');
    }

    const p = new Peer({
      initiator,
      trickle: false, // Set to false for more robust signaling
      config: { iceServers: ICE_SERVERS },
      stream: streamRef.current || undefined,
    });

    p.on('signal', signal => {
      console.log('Emitting signal to:', targetSocketId, 'type:', signal.type || 'candidate');
      currentSocket.emit('signal', { target: targetSocketId, signal, sender: user?.id });
    });

    p.on('stream', stream => {
      console.log('Received remote stream');
      setRemoteStream(stream);
      setIsConnected(true);
    });

    p.on('connect', () => {
      console.log('Peer connected');
      setIsConnected(true);
    });

    p.on('close', () => setIsConnected(false));
    p.on('error', err => console.error('Peer error:', err));

    setPeer(p);
    peerRef.current = p;
    return p;
  };

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
      socket?.emit('media-status-change', { audio: isMuted });
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
      socket?.emit('media-status-change', { video: isVideoOff });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const msg = {
      senderId: user?.id,
      senderName: user?.name,
      content: newMessage,
    };

    socket.emit('send-chat-message', msg);
    setNewMessage('');
  };

  const endCall = async () => {
    if (role === 'psychologist') {
      // Ask if session was completed
      const completed = window.confirm('A sessão foi concluída com sucesso?');
      await fetch(`/api/appointments/${roomId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: completed ? 'completed' : 'no-show' }),
      });
    }
    navigate('/dashboard');
  };

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Shield className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Acesso Negado</h2>
          <p className="text-slate-500">Você não tem permissão para entrar nesta sala ou a sessão não existe.</p>
          <Link to="/dashboard" className="block w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Voltar ao Painel</Link>
        </div>
      </div>
    );
  }

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-stone-950 z-50 flex flex-col font-sans">
      {/* Top Bar */}
      <div className="h-20 px-8 flex items-center justify-between bg-stone-900/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-amber-500 animate-pulse'}`}></div>
            <span className="text-[10px] font-bold text-stone-300 uppercase tracking-[0.2em]">
              {isConnected ? 'Sessão em Andamento' : 'Aguardando Participante'}
            </span>
          </div>
          <span className="text-stone-500 text-[10px] font-bold uppercase tracking-widest">ID: {roomId?.slice(0, 8)}</span>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-stone-300 text-[10px] font-bold uppercase tracking-widest">
            <Shield className="w-4 h-4 text-emerald-500" />
            Criptografia de Ponta a Ponta
          </div>
          <div className="h-6 w-px bg-white/10 mx-2"></div>
          <button className="p-3 text-stone-400 hover:text-white transition-all hover:bg-white/5 rounded-2xl border border-transparent hover:border-white/10">
            <Layout className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 flex relative overflow-hidden p-6 gap-6">
        <div className={`flex-1 relative rounded-[3rem] overflow-hidden bg-stone-900 shadow-2xl transition-all duration-500 border border-white/5 ${showChat ? 'mr-96' : ''}`}>
          {/* Remote Video */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className={`w-full h-full object-cover ${!isConnected ? 'hidden' : ''}`}
          />
          
          {!isConnected && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 space-y-8">
              {mediaError ? (
                <div className="bg-rose-500/20 border border-rose-500/50 p-6 rounded-3xl max-w-md space-y-4">
                  <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                  <h3 className="text-xl font-bold text-white">Erro de Mídia</h3>
                  <p className="text-rose-200">{mediaError}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-500 transition-colors"
                  >
                    Tentar Novamente
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <div className="w-40 h-40 bg-stone-800 rounded-full flex items-center justify-center animate-pulse border border-white/5">
                      <User className="w-20 h-20 text-stone-600" />
                    </div>
                    <Loader2 className="absolute inset-0 w-40 h-40 text-stone-500 animate-spin opacity-20" />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-serif italic text-white tracking-tight">
                      {participantJoined ? 'Conectando vídeo...' : `Aguardando ${role === 'psychologist' ? 'o paciente' : 'o psicólogo'}`}
                    </h3>
                    <p className="text-stone-400 max-w-sm mx-auto text-lg font-serif italic">
                      {participantJoined ? 'O outro participante já está na sala. Estabelecendo conexão segura...' : 'A sessão começará assim que ambos estiverem na sala.'}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Local Video (PIP) */}
          <motion.div 
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            className="absolute bottom-10 right-10 w-64 md:w-80 aspect-video bg-stone-800 rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 z-20"
          >
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover transform scale-x-[-1]" 
            />
            <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-xl text-[10px] text-white font-bold uppercase tracking-[0.2em] border border-white/10">
              Você
            </div>
          </motion.div>

          {/* Overlay Controls (Floating) */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 z-30">
            <button 
              onClick={toggleMute}
              className={`p-5 rounded-3xl transition-all ${isMuted ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-xl border border-white/10'}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            <button 
              onClick={toggleVideo}
              className={`p-5 rounded-3xl transition-all ${isVideoOff ? 'bg-rose-500 text-white shadow-xl shadow-rose-500/20' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-xl border border-white/10'}`}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
            <button 
              onClick={endCall}
              className="p-5 px-10 bg-rose-600 hover:bg-rose-500 text-white rounded-3xl font-bold transition-all flex items-center gap-4 shadow-2xl shadow-rose-600/20 group"
            >
              <PhoneOff className="w-6 h-6 group-hover:rotate-[135deg] transition-transform" />
              <span className="text-sm uppercase tracking-widest">Encerrar Sessão</span>
            </button>
            <button 
              className="p-5 rounded-3xl bg-white/10 text-white hover:bg-white/20 backdrop-blur-xl border border-white/10 transition-all"
            >
              <Monitor className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setShowChat(!showChat)}
              className={`p-5 rounded-3xl transition-all ${showChat ? 'bg-stone-100 text-stone-900 shadow-xl shadow-white/10' : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-xl border border-white/10'}`}
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Chat Sidebar */}
        <AnimatePresence>
          {showChat && (
            <motion.div 
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="absolute right-6 top-6 bottom-6 w-96 bg-stone-900 rounded-[3rem] border border-white/5 flex flex-col shadow-2xl z-40 overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h3 className="font-serif italic text-xl text-white flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-stone-400" />
                  Chat da Sessão
                </h3>
                <button onClick={() => setShowChat(false)} className="p-2 text-stone-500 hover:text-white hover:bg-white/5 rounded-full transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                    <MessageSquare className="w-16 h-16" />
                    <p className="text-lg font-serif italic">Nenhuma mensagem ainda.</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-stone-500 mb-2 px-2 font-bold uppercase tracking-widest">{msg.senderName}</span>
                    <div className={`max-w-[90%] p-5 rounded-[2rem] text-sm font-serif italic leading-relaxed shadow-sm ${msg.senderId === user?.id ? 'bg-stone-100 text-stone-900 rounded-tr-none' : 'bg-stone-800 text-stone-200 rounded-tl-none border border-white/5'}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-6 bg-white/5 border-t border-white/5">
                <div className="relative group">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreva uma mensagem..."
                    className="w-full bg-stone-950 text-white text-lg font-serif italic rounded-2xl py-5 pl-6 pr-16 border border-white/5 focus:border-stone-500 outline-none transition-all placeholder:text-stone-600"
                  />
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-3 text-stone-400 hover:text-white transition-colors">
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
