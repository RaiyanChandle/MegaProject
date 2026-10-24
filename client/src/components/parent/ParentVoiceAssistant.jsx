import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  X, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  GraduationCap, 
  Clock, 
  Award, 
  BookOpen, 
  CreditCard, 
  Megaphone, 
  CheckCircle2, 
  AlertTriangle,
  RotateCcw,
  Languages
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { useLanguage } from '../../context/LanguageContext';

// Regional SpeechRecognition language mapping
const SPEECH_LANG_MAP = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  kn: 'kn-IN',
  en: 'en-IN'
};

// Localized capability prompt chips for parents
const CAPABILITY_PROMPTS = {
  mr: [
    { label: 'हजेरी अहवाल', query: 'माझ्या मुलाची एकूण हजेरी आणि विषयवार हजेरी कशी आहे?', icon: Clock },
    { label: 'परीक्षेचे गुण', query: 'मुलाला परीक्षेत किती गुण मिळाले आहेत आणि निकाल काय आहे?', icon: Award },
    { label: 'बाकी गृहपाठ', query: 'काही स्वाध्याय किंवा असाइनमेंट जमा करणे बाकी आहे का?', icon: BookOpen },
    { label: 'संपूर्ण प्रगती', query: 'माझ्या मुलाचा संपूर्ण शैक्षणिक प्रगती अहवाल द्या.', icon: GraduationCap },
    { label: 'फीस माहिती', query: 'कॉलेजची काही फी भरणे बाकी आहे का?', icon: CreditCard },
  ],
  hi: [
    { label: 'उपस्थिति रिपोर्ट', query: 'मेरे बच्चे की कुल उपस्थिति और विषयों में हाजिरी कैसी है?', icon: Clock },
    { label: 'परीक्षा अंक', query: 'बच्चे के हालिया परीक्षा परिणाम और अंक क्या हैं?', icon: Award },
    { label: 'लंबित असाइनमेंट', query: 'क्या कोई गृहकार्य या असाइनमेंट जमा करना बाकी है?', icon: BookOpen },
    { label: 'समग्र प्रगति', query: 'मेरे बच्चे की संपूर्ण शैक्षणिक स्थिति की जानकारी दीजिए।', icon: GraduationCap },
    { label: 'फीस विवरण', query: 'क्या कोई कॉलेज फीस बकाया है?', icon: CreditCard },
  ],
  en: [
    { label: 'Attendance Check', query: "What is my child's overall attendance and are there any low attendance warnings?", icon: Clock },
    { label: 'Marks & Results', query: "How did my child perform in recent exams and assessments?", icon: Award },
    { label: 'Pending Homework', query: "Are there any pending or overdue assignments my ward needs to submit?", icon: BookOpen },
    { label: 'Overall Summary', query: "Please give me a complete academic progress summary for my ward.", icon: GraduationCap },
    { label: 'Fee Dues', query: "Are there any outstanding fee dues for my child?", icon: CreditCard },
  ]
};

export default function ParentVoiceAssistant({ 
  isOpen, 
  onClose, 
  childrenList = [], 
  selectedChildId = '', 
  onSelectChild 
}) {
  const { currentLanguage, languages, changeLanguage, t } = useLanguage();
  
  // Active student selection
  const [activeChildId, setActiveChildId] = useState(selectedChildId);
  const activeStudent = childrenList.find(c => c.id === activeChildId) || childrenList[0] || null;

  // Interaction State
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState([]);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);
  const [micError, setMicError] = useState(null);

  const recognitionRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Sync selected child prop
  useEffect(() => {
    if (selectedChildId) {
      setActiveChildId(selectedChildId);
    } else if (childrenList.length > 0) {
      setActiveChildId(childrenList[0].id);
    }
  }, [selectedChildId, childrenList]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [conversation, isLoading]);

  // Check Web Speech API Recognition Support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Cleanup speech synthesis on unmount or close
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  // Start Voice Recognition
  const startListening = () => {
    setMicError(null);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    try {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsSpeakingTts(false);
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = SPEECH_LANG_MAP[currentLanguage] || 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setInputText(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setMicError('Microphone access was denied. Please allow microphone permissions in browser.');
        } else if (event.error !== 'no-speech') {
          setMicError(`Voice error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setMicError('Could not access microphone.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  };

  // Submit Query to Backend Gemini AI
  const handleSendQuery = async (queryToSend = inputText) => {
    const cleanQuery = (queryToSend || '').trim();
    if (!cleanQuery) return;

    if (isListening) {
      stopListening();
    }

    // Add user message to conversation
    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: cleanQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setConversation(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    setMicError(null);

    try {
      const response = await apiClient.post('/parents/ai-assistant', {
        studentId: activeStudent?.id,
        query: cleanQuery,
        language: currentLanguage
      });

      const aiText = response?.response || 'Sorry, I could not fetch information for your ward at this moment.';
      const metrics = response?.metrics || null;

      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: aiText,
        metrics,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setConversation(prev => [...prev, aiMsg]);

      // Auto-read response aloud if speech synthesis is available
      speakText(aiText);
    } catch (err) {
      console.error('AI assistant query error:', err);
      const errMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: 'माहिती मिळवताना तांत्रिक त्रुटी आली. कृपया पुन्हा प्रयत्न करा. (Failed to connect to AI assistant. Please try again.)',
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setConversation(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Text-To-Speech Output
  const speakText = (text) => {
    if (!window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();

      // Clean markdown tags for natural speech
      const cleanText = text
        .replace(/[*#_~`>]/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\n\s*\n/g, '. ');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const isDevanagari = /[\u0900-\u097F]/.test(cleanText);
      if (isDevanagari) {
        utterance.lang = currentLanguage === 'mr' ? 'mr-IN' : 'hi-IN';
      } else {
        utterance.lang = SPEECH_LANG_MAP[currentLanguage] || 'en-IN';
      }
      utterance.rate = 0.95;

      const voices = window.speechSynthesis.getVoices() || [];
      const matchingVoice = voices.find(v => v.lang.toLowerCase() === utterance.lang.toLowerCase() || v.lang.toLowerCase().startsWith(utterance.lang.slice(0, 2).toLowerCase()));
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => setIsSpeakingTts(true);
      utterance.onend = () => setIsSpeakingTts(false);
      utterance.onerror = () => setIsSpeakingTts(false);

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      setIsSpeakingTts(false);
    }
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeakingTts(false);
    }
  };

  // Get capability suggestions based on language
  const promptList = CAPABILITY_PROMPTS[currentLanguage] || CAPABILITY_PROMPTS.mr || CAPABILITY_PROMPTS.en;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-surface-0 border border-border rounded-2xl shadow-2xl w-full max-w-2xl h-[92vh] max-h-[750px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 relative font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-ink-900 via-ink-800 to-ink-900 text-white flex items-center justify-between gap-3 shrink-0 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brass-500/20 border border-brass-400/30 flex items-center justify-center text-brass-400 shrink-0 shadow-inner">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-tight truncate">
                  NEXUS Voice AI Counselor
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brass-500 text-white font-bold tracking-wider shrink-0">
                  Gemini 2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-300 truncate mt-0.5">
                {currentLanguage === 'mr' ? 'बोलून आपल्या पाल्याची हजेरी व प्रगती जाणून घ्या' :
                 currentLanguage === 'hi' ? 'बोलकर अपने बच्चे की उपस्थिति और अंक जानिए' :
                 'Voice inquiry for your ward in your preferred language'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isSpeakingTts && (
              <button
                onClick={stopSpeaking}
                className="p-2 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs flex items-center gap-1 transition-colors"
                title="Stop speaking"
              >
                <VolumeX size={15} />
                <span className="hidden sm:inline text-[11px] font-medium">Mute</span>
              </button>
            )}

            <button
              onClick={() => {
                if (window.speechSynthesis) window.speechSynthesis.cancel();
                onClose();
              }}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title="Close Assistant"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Child Selector & Language Bar */}
        <div className="px-4 py-2.5 bg-surface-50 border-b border-border flex items-center justify-between gap-3 text-xs shrink-0 flex-wrap">
          {/* Ward Selector */}
          <div className="flex items-center gap-2 min-w-0">
            <GraduationCap size={15} className="text-ink-700 shrink-0" />
            <span className="text-text-500 font-medium shrink-0">Ward:</span>
            {childrenList.length > 1 ? (
              <select
                value={activeChildId}
                onChange={(e) => {
                  setActiveChildId(e.target.value);
                  if (onSelectChild) onSelectChild(e.target.value);
                }}
                className="bg-surface-0 border border-border rounded-md px-2 py-1 font-bold text-text-900 cursor-pointer focus:ring-1 focus:ring-ink-700"
              >
                {childrenList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.rollNumber || c.instituteId || 'Student'})
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-bold text-text-900 truncate">
                {activeStudent?.name || 'Linked Student'}
                {activeStudent?.rollNumber ? ` (Roll: ${activeStudent.rollNumber})` : ''}
              </span>
            )}
          </div>

          {/* Quick Voice Language Badge */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Languages size={13} className="text-text-500" />
            <span className="text-text-500 font-medium">Voice Lang:</span>
            <span className="font-bold text-ink-900 bg-surface-0 border border-border px-2 py-0.5 rounded text-[11px]">
              {languages.find(l => l.code === currentLanguage)?.native || 'English'}
            </span>
          </div>
        </div>

        {/* Chat / Message Stream Area */}
        <div 
          ref={chatScrollRef}
          className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/50"
        >
          {/* Initial Capability Welcome Card (Shown if no messages yet) */}
          {conversation.length === 0 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-surface-0 border border-border rounded-xl p-4 sm:p-5 shadow-xs text-center space-y-2.5">
                <div className="w-12 h-12 rounded-full bg-ink-900/5 text-ink-900 flex items-center justify-center mx-auto shadow-xs">
                  <Mic size={22} className="text-ink-800" />
                </div>
                <h4 className="font-bold text-base text-text-900">
                  {currentLanguage === 'mr' ? 'कसे विचाराल? (How to ask?)' :
                   currentLanguage === 'hi' ? 'कैसे पूछें? (How to ask?)' :
                   'How would you like to inquire?'}
                </h4>
                <p className="text-xs text-text-500 max-w-md mx-auto leading-relaxed">
                  {currentLanguage === 'mr' ? 'खालील माइक बटण दाबून बोला किंवा सुचवलेल्या पर्यायांवर क्लिक करा. आमचे AI आपल्या पाल्याचा खरा शैक्षणिक डेटा तपासून त्याच भाषेत उत्तर देईल.' :
                   currentLanguage === 'hi' ? 'नीचे दिए माइक बटन पर क्लिक करके बोलें या सुझाव पर टैप करें। हमारा AI आपके बच्चे का आधिकारिक शैक्षणिक विवरण जांचकर उसी भाषा में उत्तर देगा।' :
                   'Tap the microphone below to ask by voice in your language, or click any quick function below to inspect live academic data.'}
                </p>
              </div>

              {/* Basic Capabilities Grid */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-text-400 uppercase tracking-wider block px-1">
                  {currentLanguage === 'mr' ? 'महत्वाचे प्रश्न (Quick Functions)' :
                   currentLanguage === 'hi' ? 'महत्वपूर्ण प्रश्न (Quick Functions)' :
                   'Available Capabilities'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {promptList.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendQuery(item.query)}
                        className="p-3 rounded-xl border border-border bg-surface-0 hover:bg-surface-100 hover:border-ink-700/40 text-left transition-all shadow-xs group flex items-start gap-2.5"
                      >
                        <div className="p-2 rounded-lg bg-surface-50 text-ink-900 group-hover:bg-ink-900 group-hover:text-white transition-colors shrink-0 mt-0.5">
                          <Icon size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-text-900 group-hover:text-ink-900 transition-colors">
                            {item.label}
                          </p>
                          <p className="text-[11px] text-text-500 line-clamp-1 mt-0.5">
                            "{item.query}"
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Render Conversation Messages */}
          {conversation.map((msg) => (
            <div 
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-text-400 px-1 font-mono">
                <span>{msg.sender === 'user' ? 'You (Guardian)' : 'NEXUS AI'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>

              <div 
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-ink-900 text-white rounded-tr-none'
                    : msg.isError
                      ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-none'
                      : 'bg-surface-0 border border-border text-text-900 rounded-tl-none shadow-sm'
                }`}
              >
                {/* AI Markdown / Content Formatted */}
                <div className="whitespace-pre-wrap space-y-2">
                  {msg.text}
                </div>

                {/* Quick Metric Pills if provided by AI */}
                {msg.metrics && (
                  <div className="mt-3 pt-3 border-t border-border/80 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="bg-surface-50 p-2 rounded-lg border border-border">
                      <span className="text-[10px] text-text-500 block">Attendance</span>
                      <span className={`font-mono font-bold ${msg.metrics.isLowAttendance ? 'text-danger' : 'text-emerald-700'}`}>
                        {msg.metrics.attendancePercentage}%
                      </span>
                    </div>

                    <div className="bg-surface-50 p-2 rounded-lg border border-border">
                      <span className="text-[10px] text-text-500 block">Pending Tasks</span>
                      <span className="font-mono font-bold text-amber-800">
                        {msg.metrics.pendingAssignments} ({msg.metrics.overdueAssignments} overdue)
                      </span>
                    </div>

                    <div className="bg-surface-50 p-2 rounded-lg border border-border col-span-2 sm:col-span-1">
                      <span className="text-[10px] text-text-500 block">Passed Subjects</span>
                      <span className="font-mono font-bold text-text-900">
                        {msg.metrics.passedSubjects} / {msg.metrics.totalSubjects}
                      </span>
                    </div>
                  </div>
                )}

                {/* Speaker button on AI responses */}
                {msg.sender === 'ai' && !msg.isError && (
                  <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => speakText(msg.text)}
                      className="text-[11px] font-semibold text-ink-700 hover:text-ink-900 inline-flex items-center gap-1 transition-colors"
                      title="Read aloud in voice"
                    >
                      <Volume2 size={13} />
                      <span>{currentLanguage === 'mr' ? 'ऐका (Listen)' : currentLanguage === 'hi' ? 'सुनें (Listen)' : 'Read Aloud'}</span>
                    </button>
                    <span className="text-[10px] font-mono text-text-400">
                      Grounded in Live Database
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing / Processing Indicator */}
          {isLoading && (
            <div className="flex flex-col items-start space-y-1.5 animate-in fade-in duration-150">
              <span className="text-[10px] text-text-400 px-1 font-mono">NEXUS AI is analyzing records...</span>
              <div className="bg-surface-0 border border-border rounded-2xl rounded-tl-none p-3.5 shadow-xs flex items-center gap-3">
                <RefreshCw size={15} className="animate-spin text-ink-700" />
                <span className="text-xs text-text-600 font-medium">
                  {currentLanguage === 'mr' ? 'पाल्याचा डेटा तपासून उत्तर तयार होत आहे...' :
                   currentLanguage === 'hi' ? 'बच्चे का रिकॉर्ड जांचकर उत्तर तैयार हो रहा है...' :
                   'Fetching academic records and formatting response...'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Listening Waveform Banner (Active during speech recognition) */}
        {isListening && (
          <div className="bg-ink-900 text-white px-4 py-3 border-t border-ink-700 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-3 min-w-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              
              <div className="min-w-0">
                <p className="text-xs font-bold text-white tracking-wide truncate">
                  {currentLanguage === 'mr' ? 'ऐकत आहे... कृपया स्पष्ट बोला' :
                   currentLanguage === 'hi' ? 'सुन रहे हैं... कृपया स्पष्ट बोलिए' :
                   'Listening... Speak your question now'}
                </p>
                {inputText && (
                  <p className="text-[11px] text-brass-300 font-mono italic truncate max-w-sm sm:max-w-md">
                    "{inputText}"
                  </p>
                )}
              </div>
            </div>

            {/* Sound Wave Animation Visualizer */}
            <div className="flex items-center gap-1 shrink-0 px-2">
              <span className="w-1 h-3 bg-brass-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-5 bg-brass-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-4 bg-brass-500 rounded-full animate-bounce" />
              <span className="w-1 h-6 bg-brass-400 rounded-full animate-bounce [animation-delay:-0.2s]" />
              <span className="w-1 h-3 bg-brass-300 rounded-full animate-bounce [animation-delay:-0.4s]" />
            </div>

            <button
              onClick={() => handleSendQuery(inputText)}
              disabled={!inputText.trim()}
              className="px-3 py-1.5 bg-brass-500 hover:bg-brass-400 text-ink-900 font-bold text-xs rounded-lg transition-colors disabled:opacity-50 shrink-0"
            >
              Done & Ask
            </button>
          </div>
        )}

        {/* Microphone Error Alert */}
        {micError && (
          <div className="bg-red-50 border-t border-red-200 px-4 py-2.5 text-xs text-red-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="shrink-0 text-red-500" />
              <span>{micError}</span>
            </div>
            <button onClick={() => setMicError(null)} className="text-red-500 hover:text-red-900">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Input Control Bottom Bar */}
        <div className="p-3 sm:p-4 border-t border-border bg-surface-0 shrink-0">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuery();
            }}
            className="flex items-center gap-2"
          >
            {/* Big Mic Button */}
            {speechSupported ? (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 shadow-xs ${
                  isListening
                    ? 'bg-red-600 text-white ring-4 ring-red-200 animate-pulse'
                    : 'bg-ink-900 hover:bg-ink-800 text-brass-400 hover:text-brass-300'
                }`}
                title={isListening ? 'Stop listening' : 'Start voice input (Click and speak)'}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            ) : null}

            {/* Text Input Fallback / Input Field */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder={
                  isListening
                    ? (currentLanguage === 'mr' ? 'ऐकत आहे...' : currentLanguage === 'hi' ? 'सुन रहे हैं...' : 'Listening...')
                    : (currentLanguage === 'mr' ? 'माइक दाबा किंवा येथे टाईप करा...' : currentLanguage === 'hi' ? 'माइक दबाएं या यहाँ लिखें...' : 'Ask about attendance, marks, homework...')
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border text-xs sm:text-sm focus:border-ink-700 focus:ring-1 focus:ring-ink-700 bg-surface-50 transition-colors placeholder:text-text-400"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={() => setInputText('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-400 hover:text-text-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Send Button */}
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="w-11 h-11 rounded-xl bg-ink-900 hover:bg-ink-800 disabled:opacity-40 text-white flex items-center justify-center transition-colors shrink-0 shadow-xs"
              title="Send Inquiry"
            >
              <Send size={18} />
            </button>
          </form>

          {/* Helper Micro-copy */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-text-400 px-1">
            <span>
              💡 {currentLanguage === 'mr' ? 'माइकवर टॅप करा आणि मराठी किंवा हिंदीत विचारा' :
                  currentLanguage === 'hi' ? 'माइक पर टैप करके हिंदी या अंग्रेजी में पूछें' :
                  'Tap mic & speak naturally in your mother tongue'}
            </span>
            <span className="hidden sm:inline font-mono">
              KITCOEK NEXUS AI
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
