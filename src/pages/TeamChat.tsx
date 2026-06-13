import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { supabase, isUsingMock } from '../supabaseClient';
import { 
  Send, 
  MessageSquare, 
  Users, 
  Clock, 
  Loader2,
  Shield,
  UserCheck
} from 'lucide-react';

interface ChatMessage {
  id: string;
  workspace_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
  };
}

const TeamChat: React.FC = () => {
  const { user } = useAuth();
  const { activeWorkspace, members, getWorkspaceMessages, sendWorkspaceMessage } = useWorkspace();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false); // mobile toggle

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Auto scroll function
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Initial Load of messages
  const loadMessages = async () => {
    if (!activeWorkspace) return;
    const { messages: loaded, error } = await getWorkspaceMessages(activeWorkspace.id);
    if (!error) {
      setMessages(loaded);
    }
    setLoading(false);
    // Auto-scroll on initial load after UI renders
    setTimeout(scrollToBottom, 100);
  };

  useEffect(() => {
    setLoading(true);
    loadMessages();
  }, [activeWorkspace]);

  // 2. Real-time updates handler
  useEffect(() => {
    if (!activeWorkspace) return;

    let cleanup = () => {};

    if (isUsingMock) {
      // Mock Real-time: Listen to local custom window events
      const handleMockMessage = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail && detail.workspaceId === activeWorkspace.id) {
          loadMessages();
        }
      };

      window.addEventListener('workspace-chat-message', handleMockMessage);
      
      // Fallback Polling for multi-tab mock DB sync
      const intervalId = setInterval(() => {
        loadMessages();
      }, 3000);

      cleanup = () => {
        window.removeEventListener('workspace-chat-message', handleMockMessage);
        clearInterval(intervalId);
      };
    } else {
      // Live Supabase Postgres Changes Channel Subscription
      const channel = supabase
        .channel(`workspace-chat-${activeWorkspace.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'workspace_messages',
            filter: `workspace_id=eq.${activeWorkspace.id}`
          },
          async (payload: any) => {
            // Fetch the profile for the new message to display the avatar and name
            const newMsg = payload.new;
            let profile = null;
            
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMsg.user_id)
              .single();
            
            if (profileData) {
              profile = profileData;
            }

            setMessages((prev) => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, { ...newMsg, profile }];
            });
            setTimeout(scrollToBottom, 50);
          }
        )
        .subscribe();

      cleanup = () => {
        supabase.removeChannel(channel);
      };
    }

    return () => {
      cleanup();
    };
  }, [activeWorkspace]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeWorkspace || !user) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const { message, error } = await sendWorkspaceMessage(activeWorkspace.id, content);
    if (!error && message) {
      setMessages((prev) => {
        if (prev.some(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
      scrollToBottom();
    }

    setSending(false);
    messageInputRef.current?.focus();
  };

  // Helper to format timestamps
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return '';
    }
  };

  // Helper to get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  // Helper to assign role icon
  const getRoleIcon = (role: string) => {
    if (role === 'owner') return <Shield size={12} className="text-amber-500 fill-amber-500/10 shrink-0" title="Workspace Owner" />;
    if (role === 'manager') return <UserCheck size={12} className="text-violet-500 shrink-0" title="Workspace Manager" />;
    return null;
  };

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400 dark:text-slate-500 page-enter">
        <MessageSquare size={48} className="stroke-[1.5] mb-4 text-violet-500/40 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Active Workspace</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Please select or create a workspace using the sidebar menu first.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] min-h-[400px] flex gap-5 page-enter overflow-hidden">
      
      {/* Main Chat Box Container */}
      <div className="flex-1 flex flex-col rounded-3xl glass-card relative overflow-hidden">
        
        {/* Chat Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-violet-100/50 dark:border-violet-900/20 bg-white/20 dark:bg-slate-900/10 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 text-white font-bold text-base shadow-lg shadow-violet-600/20">
              #
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white leading-tight">Team General Chat</h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                <span>Active room for {activeWorkspace.name}</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowMembersList(prev => !prev)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border border-violet-100 dark:border-violet-900/30 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-150 md:hidden"
            >
              <Users size={14} />
              <span>Members ({members.length})</span>
            </button>
            
            <div className="hidden md:flex items-center gap-1.5 rounded-xl bg-violet-500/10 border border-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-600 dark:text-violet-400">
              <Users size={14} />
              <span>{members.length} member{members.length === 1 ? '' : 's'}</span>
            </div>
          </div>
        </div>

        {/* Messages Feed Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 scrollbar-thin scrollbar-thumb-violet-100 dark:scrollbar-thumb-slate-800">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <Loader2 className="animate-spin text-violet-500 mb-2" size={24} />
              <p className="text-xs font-semibold">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
              <div className="h-16 w-16 rounded-full bg-violet-500/10 text-violet-500 flex items-center justify-center mb-4 border border-violet-500/20">
                <MessageSquare size={28} className="stroke-[1.5]" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Start the conversation</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                Welcome to the very beginning of the <strong>{activeWorkspace.name}</strong> workspace chat. Send a message to get things started!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isCurrentUserObj = msg.user_id === user?.id;
              const senderName = msg.profile?.full_name || 'Team Member';
              
              // Group messages by date
              const showDateHeader = index === 0 || 
                formatDate(messages[index - 1].created_at) !== formatDate(msg.created_at);

              return (
                <div key={msg.id} className="space-y-3">
                  {showDateHeader && (
                    <div className="flex items-center justify-center my-6">
                      <div className="h-px bg-violet-100/50 dark:bg-violet-900/10 flex-1"></div>
                      <span className="px-4 py-1 rounded-full bg-violet-50/50 dark:bg-slate-900/50 border border-violet-100/30 dark:border-violet-900/10 text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wide uppercase">
                        {formatDate(msg.created_at)}
                      </span>
                      <div className="h-px bg-violet-100/50 dark:bg-violet-900/10 flex-1"></div>
                    </div>
                  )}

                  <div className={`flex gap-3 group items-start ${isCurrentUserObj ? 'justify-end' : ''}`}>
                    
                    {/* User Avatar Badge */}
                    {!isCurrentUserObj && (
                      msg.profile?.avatar_url ? (
                        <img 
                          src={msg.profile.avatar_url} 
                          alt={senderName} 
                          className="h-8 w-8 rounded-xl object-cover border border-violet-100 dark:border-violet-950/20 mt-0.5 shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-xl bg-violet-500 text-white font-bold text-xs flex items-center justify-center mt-0.5 shrink-0 shadow-md">
                          {getInitials(senderName)}
                        </div>
                      )
                    )}

                    {/* Chat Bubble Details */}
                    <div className={`max-w-[70%] space-y-1 ${isCurrentUserObj ? 'text-right' : ''}`}>
                      {!isCurrentUserObj && (
                        <div className="flex items-center gap-1.5 px-0.5">
                          <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200">{senderName}</span>
                          {msg.profile && getRoleIcon(
                            members.find(m => m.user_id === msg.user_id)?.role || 'member'
                          )}
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium ml-1 flex items-center gap-0.5">
                            <Clock size={8} />
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      )}

                      {/* Bubble content */}
                      <div className={`p-3 text-sm leading-relaxed shadow-sm rounded-2xl ${
                        isCurrentUserObj 
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white/80 dark:bg-slate-900/60 border border-violet-100/30 dark:border-violet-900/10 text-slate-800 dark:text-slate-100 rounded-tl-none'
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>

                      {isCurrentUserObj && (
                        <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium px-0.5 flex items-center gap-0.5 justify-end">
                          <Clock size={8} />
                          {formatTime(msg.created_at)}
                        </div>
                      )}
                    </div>

                    {/* Self Avatar (Right aligned) */}
                    {isCurrentUserObj && (
                      user?.avatar_url ? (
                        <img 
                          src={user.avatar_url} 
                          alt={user.full_name} 
                          className="h-8 w-8 rounded-xl object-cover border border-violet-100 dark:border-violet-950/20 mt-0.5 shrink-0 shadow-sm"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-xl bg-violet-600 text-white font-bold text-xs flex items-center justify-center mt-0.5 shrink-0 shadow-md">
                          {getInitials(user?.full_name || 'User')}
                        </div>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Compose Box */}
        <div className="px-6 py-4 border-t border-violet-100/50 dark:border-violet-900/20 bg-white/20 dark:bg-slate-900/10 backdrop-blur-md z-10">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <input
              type="text"
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message general chat...`}
              disabled={sending}
              className="flex-1 rounded-2xl p-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none glass-input"
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="flex items-center justify-center gap-1.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white px-5 py-3 text-xs font-bold transition-all duration-150 hover:shadow-lg hover:shadow-violet-600/20 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex-shrink-0"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Send size={14} />
                  <span>Send</span>
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      {/* Workspace Members Drawer / Sidebar Panel (Desktop & mobile toggle) */}
      <div className={`${
        showMembersList ? 'fixed inset-y-0 right-0 z-50 w-72 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md shadow-2xl p-5 border-l border-violet-100 dark:border-violet-950/20 animate-in slide-in-from-right duration-250 md:relative md:inset-auto md:z-0 md:w-64 md:bg-transparent md:backdrop-blur-none md:shadow-none md:p-0 md:border-none md:flex md:flex-col' : 'hidden md:flex md:flex-col md:w-64 shrink-0'
      } gap-4`}>
        
        {/* Mobile close button */}
        {showMembersList && (
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 md:hidden mb-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Room Members</h4>
            <button 
              onClick={() => setShowMembersList(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 border border-slate-200 dark:border-slate-800 rounded-lg"
            >
              Close
            </button>
          </div>
        )}

        {/* Member list content */}
        <div className="flex-1 flex flex-col rounded-3xl glass-card p-5 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-violet-100/50 dark:border-violet-900/20 pb-3 mb-4 shrink-0">
            <Users size={16} className="text-violet-500" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Workspace Members</h4>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {members.map((member) => {
              const name = member.profile?.full_name || 'Team Member';
              const role = member.role;
              const isCurrentUser = member.user_id === user?.id;

              return (
                <div key={member.id} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-violet-50/30 dark:hover:bg-slate-900/30 transition-all duration-150">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {member.profile?.avatar_url ? (
                      <img 
                        src={member.profile.avatar_url} 
                        alt={name} 
                        className="h-7 w-7 rounded-lg object-cover border border-violet-100 dark:border-violet-950/20 shrink-0"
                      />
                    ) : (
                      <div className="h-7 w-7 rounded-lg bg-violet-500 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                        {getInitials(name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate pr-1">
                        {name} {isCurrentUser && <span className="text-[9px] text-violet-500 dark:text-violet-400 font-medium">(You)</span>}
                      </p>
                      <span className="text-[9px] text-slate-500 dark:text-slate-450 mt-0.5 capitalize flex items-center gap-1">
                        {getRoleIcon(role)}
                        <span>{role}</span>
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/30" title="Online"></div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
};

export default TeamChat;
