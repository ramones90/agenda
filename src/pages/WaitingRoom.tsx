import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Video, Mic, MicOff, VideoOff, Settings, 
  CheckCircle2, Clock, Shield, User, 
  MessageCircle, AlertCircle, ArrowLeft,
  ChevronRight, Sparkles, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../lib/api';

export default function WaitingRoom() {
  const { id: roomId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [equipmentStatus, setEquipmentStatus] = useState({
    camera: 'checking',
    mic: 'checking',
    connection: 'checking'
  });

  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        const res = await apiFetch(`/api/rooms/${roomId}/validate?userId=${user?.id}`);
        const data = await res.json();
        if (data.authorized) {
          setAppointment(data.appointment);
          setIsLoading(false);
        } else {
          navigate('/dashboard');
        }
      } catch (err) {
        navigate('/dashboard');
      }
    };

    if (user && roomId) fetchAppointment();
  }, [roomId, user, navigate]);

  useEffect(() => {
    // Start camera/mic test
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(s => {
        setStream(s);
        setEquipmentStatus({
          camera: 'ok',
          mic: 'ok',
          connection: 'ok'
        });
      })
      .catch(err => {
        console.error(err);
        setEquipmentStatus({
          camera: 'error',
          mic: 'error',
          connection: 'ok'
        });
      });

    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!appointment) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const aptTime = new Date(appointment.date).getTime();
      const diff = aptTime - now;

      if (diff <= 0) {
        setTimeLeft('Sua sessão já pode começar!');
        clearInterval(timer);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`Começa em ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [appointment]);

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks()[0].enabled = isVideoOff;
      setIsVideoOff(!isVideoOff);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-stone-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-20">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-16">
          <Link to="/dashboard" className="group flex items-center gap-2 text-stone-400 hover:text-stone-900 transition-colors">
            <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            <span className="font-medium">Voltar ao Painel</span>
          </Link>
          <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 px-6 py-2.5 rounded-full border border-emerald-100 shadow-sm">
            <Shield className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Sessão Segura & Privada</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left: Video Preview */}
          <div className="space-y-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-video bg-stone-900 rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white group"
            >
              {stream && !isVideoOff ? (
                <video 
                  autoPlay 
                  playsInline 
                  muted 
                  ref={el => el && (el.srcObject = stream)}
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-stone-500 space-y-6 bg-stone-900/40 backdrop-blur-sm">
                  <div className="w-24 h-24 bg-stone-800/50 rounded-full flex items-center justify-center border border-white/10">
                    <VideoOff className="w-10 h-10 text-stone-400" />
                  </div>
                  <p className="font-serif italic text-xl text-stone-300">Câmera desligada</p>
                </div>
              )}

              {/* Controls Overlay */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button 
                  onClick={toggleMute}
                  className={`p-5 rounded-2xl transition-all shadow-xl ${isMuted ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 border border-white/10'}`}
                >
                  {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
                <button 
                  onClick={toggleVideo}
                  className={`p-5 rounded-2xl transition-all shadow-xl ${isVideoOff ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 border border-white/10'}`}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
                <button className="p-5 rounded-2xl bg-white/10 backdrop-blur-xl text-white hover:bg-white/20 border border-white/10 transition-all shadow-xl">
                  <Settings className="w-6 h-6" />
                </button>
              </div>
            </motion.div>

            {/* Equipment Checklist */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm space-y-6">
              <h3 className="text-lg font-serif italic text-stone-900 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-stone-400" />
                Checklist de Preparação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Câmera', status: equipmentStatus.camera },
                  { label: 'Microfone', status: equipmentStatus.mic },
                  { label: 'Conexão', status: equipmentStatus.connection }
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    {item.status === 'ok' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    )}
                    <span className="text-sm font-medium text-stone-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Info & Join */}
          <div className="space-y-10">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white p-10 md:p-14 rounded-[3.5rem] border border-stone-100 shadow-2xl shadow-stone-200/50 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-stone-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
              
              <div className="relative z-10 space-y-10">
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-serif italic text-stone-900 tracking-tight leading-tight">
                    Quase tudo pronto!
                  </h1>
                  <p className="text-stone-500 text-lg font-serif italic">
                    Sua sessão com <span className="text-stone-900 font-bold">{appointment?.psychologist_name}</span> está agendada.
                  </p>
                </div>

                <div className="flex items-center gap-8 p-8 bg-stone-50 rounded-[2.5rem] border border-stone-100 shadow-inner">
                  <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center shadow-sm border border-stone-100">
                    <Clock className="w-10 h-10 text-stone-900" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">{timeLeft}</p>
                    <p className="text-3xl font-serif italic text-stone-900">
                      {new Date(appointment?.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-serif italic text-stone-900">Dicas para uma boa sessão:</h3>
                  <ul className="space-y-4">
                    {[
                      'Encontre um local tranquilo e privado',
                      'Use fones de ouvido para melhor áudio',
                      'Verifique se sua internet está estável',
                      'Tenha água e lenços por perto'
                    ].map((tip, i) => (
                      <li key={i} className="flex items-center gap-4 text-stone-600">
                        <div className="w-1.5 h-1.5 bg-stone-900 rounded-full"></div>
                        <span className="text-base italic font-serif">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={() => navigate(`/room/${roomId}`)}
                  className="group w-full py-6 bg-stone-900 hover:bg-stone-800 text-stone-50 rounded-[2rem] font-medium text-xl transition-all flex items-center justify-center gap-4 shadow-2xl shadow-stone-900/20"
                >
                  Entrar na Sessão
                  <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </motion.div>

            {/* Quick Support */}
            <div className="flex items-center justify-between px-8">
              <div className="flex items-center gap-3 text-stone-400">
                <MessageCircle className="w-5 h-5" />
                <span className="text-sm italic font-serif">Precisa de ajuda técnica?</span>
              </div>
              <button className="text-sm font-bold text-stone-900 hover:underline decoration-stone-200 underline-offset-4">
                Falar com Suporte
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
