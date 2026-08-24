import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Fab,
  IconButton,
  InputBase,
  Paper,
  Typography,
  Stack,
  Avatar,
  Chip,
  CircularProgress,
  Divider,
  Card,
  CardContent,
  Tooltip,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import LaptopMacIcon from '@mui/icons-material/LaptopMac';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useLocation } from 'react-router-dom';
import { useAuthUser, useAppSelector } from '../hooks/storeHooks';
import { apiFetch } from '../services/api/client';
import { isApiEnabled } from '../services/api/config';
import { ingestChatKnowledge } from '../services/api/knowledge';
import { mockHrAnswer } from '../utils/hrPolicyChat';
import {
  REQUEST_STATUS_COLORS,
  REQUEST_STATUS_LABELS,
  REQUEST_TYPE_LABELS,
  CATEGORY_LABELS,
} from '../data/demoData';

interface Message {
  role: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export function ChatbotWidget() {
  const theme = useTheme();
  const user = useAuthUser();
  const location = useLocation();
  const companyPolicies = useAppSelector((s) => s.hr.companyPolicies);
  const leavePolicies = useAppSelector((s) => s.hr.policies);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // 1. Session Persistence: Load messages from sessionStorage or default to empty
  const [messages, setMessages] = useState<Message[]>(() => {
    const cached = sessionStorage.getItem('assetly_chat_history');
    return cached ? JSON.parse(cached) : [];
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      setRecognition(rec);
    }
  }, []);

  // 1. Session Persistence: Sync messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem('assetly_chat_history', JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!user) return null;

  const isEmployee = user.role === 'employee';
  const isHrArea = location.pathname.startsWith('/hr');

  const hrSuggestionChips = [
    { label: '🏖️ Sick leave rules', text: 'What are the sick leave rules and do I need a medical certificate?' },
    { label: '🏠 WFH policy', text: 'How many WFH days am I allowed under the remote work policy?' },
    { label: '📋 Leave allowances', text: 'List leave types and how many days I get for each' },
  ];

  const suggestionChips = isHrArea
    ? hrSuggestionChips
    : isEmployee
      ? [
          { label: '🔍 Track my requests', text: 'Show my active requests' },
          { label: '💻 Show my assets', text: 'What assets are assigned to me?' },
          { label: '📄 Ask HR policy', text: 'What does the leave policy say about annual leave?' },
        ]
      : [
          { label: '📊 All device requests', text: 'Show all device requests' },
          { label: '🔍 Search laptop inventory', text: 'Search laptop inventory' },
          { label: '📄 Ask HR policy', text: 'Summarize the leave and time-off policy' },
        ];

  const portalHrPayload = {
    hrPolicies: companyPolicies
      .filter((p) => p.status === 'active')
      .map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category,
        version: p.version,
        effectiveDate: p.effectiveDate,
        content: p.content,
        status: p.status,
      })),
    leavePolicies: leavePolicies.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      maxDays: p.maxDays,
      description: p.description,
    })),
  };

  useEffect(() => {
    if (!open || !isApiEnabled()) return;
    void ingestChatKnowledge(portalHrPayload).catch(() => {
      /* ingest is optional; chat still works with keyword search */
    });
    // Re-index when the widget opens or policy documents change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, companyPolicies, leavePolicies]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-10).map((msg) => ({
        role: msg.role,
        text: msg.text,
      }));

      let responseText = '';

      if (isApiEnabled()) {
        const response = await apiFetch<{ text: string }>('/api/chat', {
          method: 'POST',
          body: JSON.stringify({
            message: textToSend,
            history: historyPayload,
            currentPath: location.pathname,
            ...portalHrPayload,
          }),
        });
        responseText = response.text;
      } else {
        await new Promise((res) => setTimeout(res, 400));
        responseText =
          mockHrAnswer(textToSend, portalHrPayload.hrPolicies, portalHrPayload.leavePolicies) ||
          `I'm running in local demo mode. Ask about HR policies or leave (e.g. sick leave, WFH), or enable \`VITE_USE_API=true\` with a free \`GEMINI_API_KEY\` for full AI. Current path: ${location.pathname}.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: responseText || 'No answer came back. Try again, or open HR Policies.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          text: `Sorry, I encountered an error communicating with the chat service: ${err.message || 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    sessionStorage.removeItem('assetly_chat_history');
    setMessages([
      {
        role: 'ai',
        text: `Chat cleared. How can I help you now, ${user.firstName}?`,
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  // 4. Rich Renderers Parser: extracts structured JSON block wrapped in ```json
  const parseJsonMessage = (text: string) => {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) return { cleanText: text, cardData: null };

    const rawJson = match[1];
    const cleanText = text.replace(/```json\s*([\s\S]*?)\s*```/, '').trim();

    try {
      const parsed = JSON.parse(rawJson);
      return { cleanText, cardData: parsed };
    } catch {
      return { cleanText: text, cardData: null };
    }
  };

  const formatText = (text: string) => {
    return text.split('\n').map((line, idx) => {
      let content: React.ReactNode = line;
      if (line.startsWith('- ') || line.startsWith('* ')) {
        content = <span>• {line.slice(2)}</span>;
      }
      return (
        <span key={idx} style={{ display: 'block', minHeight: line === '' ? '0.5rem' : 'auto' }}>
          {content}
        </span>
      );
    });
  };

  // 4. Rich Component Renderer
  const renderRichCard = (cardData: any) => {
    if (!cardData || !cardData.items || !Array.isArray(cardData.items)) return null;

    if (cardData.type === 'requests') {
      return (
        <Stack spacing={1.5} sx={{ mt: 1.5, width: '100%' }}>
          {cardData.items.map((req: any, index: number) => {
            const statusColor = REQUEST_STATUS_COLORS[req.status] || 'default';
            const statusLabel = REQUEST_STATUS_LABELS[req.status] || req.status;
            const typeLabel = REQUEST_TYPE_LABELS[req.requestType] || req.requestType;
            const categoryLabel = CATEGORY_LABELS[req.category] || req.category;

            return (
              <Card key={req.id || index} variant="outlined" sx={{ borderRadius: 2.5, bgcolor: 'background.paper', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AssignmentTurnedInIcon color="primary" fontSize="small" />
                      <Typography variant="body2" fontWeight={700}>
                        {categoryLabel}
                      </Typography>
                    </Stack>
                    <Chip label={statusLabel} color={statusColor as any} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600 }} />
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Type: <strong>{typeLabel}</strong> {req.employeeName ? `• From: ${req.employeeName}` : ''}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic', bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'grey.50', p: 1, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    "{req.description}"
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      );
    }

    if (cardData.type === 'assets') {
      return (
        <Stack spacing={1.5} sx={{ mt: 1.5, width: '100%' }}>
          {cardData.items.map((asset: any, index: number) => {
            return (
              <Card key={asset.id || index} variant="outlined" sx={{ borderRadius: 2.5, bgcolor: 'background.paper', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                    <LaptopMacIcon color="secondary" fontSize="small" />
                    <Typography variant="body2" fontWeight={700}>
                      {asset.name}
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    <Chip label={`Tag: ${asset.assetTag}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500 }} />
                    {asset.serialNumber && (
                      <Chip label={`S/N: ${asset.serialNumber}`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500 }} />
                    )}
                    <Chip label={asset.status.replace('_', ' ')} color="success" size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 600 }} />
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      );
    }

    return null;
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1100 }}>
      {!open && (
        <Fab
          onClick={() => setOpen(true)}
          aria-label="chat"
          sx={{
            background: 'linear-gradient(135deg, #1565C0 0%, #8E24AA 100%)',
            color: 'white',
            width: 60,
            height: 60,
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 24px rgba(142, 36, 170, 0.45)'
              : '0 8px 24px rgba(21, 101, 192, 0.35)',
            transition: 'transform 0.25s, box-shadow 0.25s, background 0.25s',
            animation: 'fabPulse 3s infinite',
            '@keyframes fabPulse': {
              '0%': { boxShadow: theme.palette.mode === 'dark' ? '0 0 0 0 rgba(142, 36, 170, 0.5)' : '0 0 0 0 rgba(21, 101, 192, 0.4)' },
              '70%': { boxShadow: theme.palette.mode === 'dark' ? '0 0 0 12px rgba(142, 36, 170, 0)' : '0 0 0 12px rgba(21, 101, 192, 0)' },
              '100%': { boxShadow: theme.palette.mode === 'dark' ? '0 0 0 0 rgba(142, 36, 170, 0)' : '0 0 0 0 rgba(21, 101, 192, 0)' }
            },
            '&:hover': {
              transform: 'scale(1.08) rotate(5deg)',
              background: 'linear-gradient(135deg, #1976D2 0%, #9C27B0 100%)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 12px 28px rgba(142, 36, 170, 0.65)'
                : '0 12px 28px rgba(21, 101, 192, 0.55)',
            },
          }}
        >
          <SmartToyIcon sx={{ fontSize: 28 }} />
        </Fab>
      )}

      {open && (
        <Paper
          elevation={12}
          sx={{
            width: { xs: 340, sm: 400 },
            height: 560,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 4,
            overflow: 'hidden',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 12px 40px rgba(0,0,0,0.65)'
              : '0 12px 40px rgba(0,0,0,0.18)',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            animation: 'fadeInUp 0.3s cubic-bezier(0.1, 0.76, 0.55, 0.94)',
            '@keyframes fadeInUp': {
              '0%': { opacity: 0, transform: 'translateY(24px) scale(0.95)' },
              '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
            },
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #1565C0 0%, #8E24AA 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ position: 'relative' }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.18)', width: 36, height: 36 }}>
                  <SmartToyIcon fontSize="medium" />
                </Avatar>
                {/* Glowing Green Online Indicator */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: '#4caf50',
                    border: '2px solid #1565C0',
                    boxShadow: '0 0 8px #4caf50',
                  }}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2" fontWeight={800} sx={{ letterSpacing: '0.02em' }}>
                  Assetly Assistant
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: -0.25, fontSize: '0.72rem' }}>
                  {isEmployee ? 'Self-Service Support' : 'IT Operations Copilot'}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Clear conversation">
                <IconButton size="small" color="inherit" onClick={handleClear} sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                  <DeleteSweepIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close Assistant">
                <IconButton size="small" color="inherit" onClick={() => setOpen(false)} sx={{ opacity: 0.8, '&:hover': { opacity: 1 } }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              p: 2.5,
              overflowY: 'auto',
              bgcolor: theme.palette.mode === 'dark' ? '#121212' : '#f8f9fa',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(0, 0, 0, 0.1)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: 'rgba(0, 0, 0, 0.2)',
              },
            }}
          >
            <Stack spacing={2}>
              {messages.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
                  <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', width: 48, height: 48, mx: 'auto', mb: 2 }}>
                    <SmartToyIcon fontSize="medium" />
                  </Avatar>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Welcome to Assetly Assist
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    I can search inventory, check assignments, or submit device requests. Try clicking a suggestion below!
                  </Typography>
                </Box>
              )}

              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const { cleanText, cardData } = isUser ? { cleanText: msg.text, cardData: null } : parseJsonMessage(msg.text);

                return (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                      width: '100%',
                      animation: 'msgFadeIn 0.25s ease-out',
                      '@keyframes msgFadeIn': {
                        from: { opacity: 0, transform: 'translateY(8px)' },
                        to: { opacity: 1, transform: 'translateY(0)' },
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: isUser ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-start',
                        width: '100%',
                      }}
                    >
                      {!isUser && (
                        <Avatar
                          sx={{
                            width: 28,
                            height: 28,
                            bgcolor: 'secondary.main',
                            fontSize: '0.75rem',
                            mr: 1.25,
                            mt: 0.25,
                            fontWeight: 700,
                          }}
                        >
                          AI
                        </Avatar>
                      )}
                      <Box
                        sx={{
                          maxWidth: '80%',
                          p: 1.75,
                          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          bgcolor: isUser ? 'primary.main' : 'background.paper',
                          color: isUser ? 'primary.contrastText' : 'text.primary',
                          boxShadow: isUser 
                            ? '0 4px 12px rgba(21, 101, 192, 0.2)'
                            : '0 4px 12px rgba(0,0,0,0.04)',
                          border: isUser ? 'none' : '1px solid',
                          borderColor: 'divider',
                          fontSize: '0.875rem',
                          lineHeight: 1.5,
                          wordBreak: 'break-word',
                          background: isUser 
                            ? 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)'
                            : undefined,
                        }}
                      >
                        {formatText(cleanText)}
                      </Box>
                    </Box>
                    
                    {/* Render Interactive Custom Cards if JSON list exists */}
                    {!isUser && cardData && (
                      <Box sx={{ pl: 5, pr: 1, width: '100%', mt: 0.5 }}>
                        {renderRichCard(cardData)}
                      </Box>
                    )}
                  </Box>
                );
              })}

              {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
                  <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main', mr: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CircularProgress size={12} color="inherit" thickness={6} />
                  </Avatar>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: '16px 16px 16px 4px',
                      bgcolor: 'background.paper',
                      color: 'text.secondary',
                      border: '1px solid',
                      borderColor: 'divider',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                    }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Thinking…
                    </Typography>
                  </Box>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Stack>
          </Box>

          <Divider />

          {/* Quick Suggestions Chips */}
          <Box sx={{ px: 1.5, py: 1.25, bgcolor: 'background.paper', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <Stack direction="row" spacing={1}>
              {suggestionChips.map((chip, i) => (
                <Chip
                  key={i}
                  label={chip.label}
                  onClick={() => handleSend(chip.text)}
                  size="small"
                  variant="outlined"
                  clickable
                  disabled={loading}
                  sx={{
                    fontSize: '0.75rem',
                    borderRadius: 2,
                    px: 0.5,
                    bgcolor: 'background.default',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                  }}
                />
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* Input Bar with Voice (Microphone) */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 -2px 10px rgba(0,0,0,0.03)',
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <InputBase
              placeholder={
                isListening
                  ? 'Listening… Speak now'
                  : isHrArea
                    ? 'Ask about leave, WFH, or HR policies…'
                    : 'Ask a question, HR policy, or device request…'
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              sx={{
                flex: 1,
                px: 2,
                py: 1,
                borderRadius: 3,
                bgcolor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f1f3f4',
                fontSize: '0.875rem',
                border: '1px solid',
                borderColor: isListening ? 'error.main' : 'divider',
                color: isListening ? 'error.main' : 'text.primary',
                transition: 'border-color 0.25s, box-shadow 0.25s',
                '&.Mui-focused': {
                  borderColor: 'primary.main',
                  boxShadow: '0 0 0 3px rgba(21, 101, 192, 0.15)',
                },
              }}
            />
            {recognition && (
              <Tooltip title={isListening ? 'Stop listening' : 'Start voice input'}>
                <IconButton
                  color={isListening ? 'error' : 'default'}
                  onClick={toggleListening}
                  disabled={loading}
                  sx={{
                    ml: 1,
                    p: 1.25,
                    bgcolor: isListening ? alpha('#d32f2f', 0.1) : 'transparent',
                    animation: isListening ? 'micPulse 1.5s infinite' : 'none',
                    '@keyframes micPulse': {
                      '0%': { transform: 'scale(1)' },
                      '50%': { transform: 'scale(1.12)', backgroundColor: 'rgba(211, 47, 47, 0.15)' },
                      '100%': { transform: 'scale(1)' },
                    },
                    '&:hover': {
                      bgcolor: isListening ? alpha('#d32f2f', 0.15) : 'action.hover',
                    }
                  }}
                >
                  {isListening ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              type="submit"
              color="primary"
              disabled={!input.trim() || loading}
              sx={{
                ml: 1,
                p: 1.25,
                bgcolor: input.trim() && !loading ? 'primary.main' : 'transparent',
                color: input.trim() && !loading ? 'white' : 'action.disabled',
                '&:hover': {
                  bgcolor: input.trim() && !loading ? 'primary.dark' : 'transparent',
                },
                transition: 'background-color 0.2s, color 0.2s',
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
