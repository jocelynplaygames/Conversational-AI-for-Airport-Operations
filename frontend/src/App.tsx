import { queryAPI } from "./api/query";
import { useState, useEffect, useRef } from 'react';
import { ChatSidebar } from './components/ChatSidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { ChatWelcome } from './components/ChatWelcome';
import { ScrollArea } from './components/ui/scroll-area';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string | Date;
  chart?: any;
  data?: any[];
  metadata?: {
    outputFormat?: string;
    outputConfidence?: number;
    queryType?: string;
    rowCount?: number;
    sqlSource?: string;
  };
}

interface ChatThread {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: string | Date;
}

const STORAGE_KEY = 'aiport_chat_threads_v7_0_fixed';

export default function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load threads
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('💾 Loaded threads:', parsed.length);
        setThreads(parsed);
        if (parsed.length > 0) {
          setActiveChat(parsed[0].id);
        }
      } catch (e) {
        console.error('Error loading threads:', e);
      }
    } else {
      // Create initial thread if none exists
      const initialThread: ChatThread = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        lastUpdated: new Date().toString()
      };
      console.log('🆕 Creating initial thread:', initialThread.id);
      setThreads([initialThread]);
      setActiveChat(initialThread.id);
    }
  }, []);

  // Save threads
  useEffect(() => {
    if (threads.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
      console.log('💾 Saved threads:', threads.length, 'Total messages:', threads.reduce((sum, t) => sum + t.messages.length, 0));
    }
  }, [threads]);

  // Auto-scroll
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [threads]);

  // Get current messages
  const currentThread = threads.find(t => t.id === activeChat);
  const messages = currentThread?.messages || [];

  console.log('🎨 Render - Active chat:', activeChat, 'Messages:', messages.length);

  const handleSendMessage = async (userMessage: string) => {
    console.log('\n=== HANDLE SEND MESSAGE ===');
    console.log('📤 Input:', userMessage);
    console.log('📍 Active chat:', activeChat);
    console.log('📚 Current threads:', threads.length);

    if (!activeChat) {
      console.error('❌ No active chat!');
      return;
    }

    // Create user message
    const userMsg: Message = {
      id: Date.now().toString(),
      content: userMessage,
      role: 'user',
      timestamp: new Date().toString()
    };

    console.log('👤 User message:', userMsg.id);

    // Add user message IMMEDIATELY
    setThreads(prevThreads => {
      const updated = prevThreads.map(t => 
        t.id === activeChat 
          ? { ...t, messages: [...t.messages, userMsg], lastUpdated: new Date().toString() }
          : t
      );
      console.log('✅ User message added. Thread now has:', updated.find(t => t.id === activeChat)?.messages.length, 'messages');
      return updated;
    });

    // Update title if this is first message
    const currentThread = threads.find(t => t.id === activeChat);
    if (currentThread && currentThread.messages.length === 0) {
      const title = userMessage.slice(0, 50);
      setThreads(prev => prev.map(t => 
        t.id === activeChat ? { ...t, title } : t
      ));
    }

    setIsTyping(true);

    try {
      console.log('🌐 Calling API...');
      const response = await queryAPI(userMessage);

      console.log('✅ API Response:', {
        success: response.success,
        hasMessage: !!response.message,
        hasData: !!response.data,
        hasChart: !!response.chart
      });

      // Create assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.message || 'No response',
        role: 'assistant',
        timestamp: new Date().toString(),
        chart: response.chart,
        data: response.data,
        metadata: {
          outputFormat: response.output_format,
          outputConfidence: response.output_confidence,
          queryType: response.use_case,
          rowCount: response.row_count || 0,
          sqlSource: response.sql_source
        }
      };

      console.log('🤖 Assistant message:', assistantMessage.id, {
        contentLength: assistantMessage.content.length,
        hasChart: !!assistantMessage.chart,
        hasData: !!assistantMessage.data,
        dataLength: assistantMessage.data?.length
      });

      // Add assistant message IMMEDIATELY with functional update
      setThreads(prevThreads => {
        const updated = prevThreads.map(t => {
          if (t.id === activeChat) {
            const newMessages = [...t.messages, assistantMessage];
            console.log('✅ Assistant message added. Thread now has:', newMessages.length, 'messages');
            return {
              ...t,
              messages: newMessages,
              lastUpdated: new Date().toString()
            };
          }
          return t;
        });
        
        const finalThread = updated.find(t => t.id === activeChat);
        console.log('📝 Final thread state:', {
          id: finalThread?.id,
          messageCount: finalThread?.messages.length,
          lastMessage: finalThread?.messages[finalThread.messages.length - 1]?.role
        });
        
        return updated;
      });

      console.log('✅ State update completed');

    } catch (error) {
      console.error('❌ Error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        role: 'assistant',
        timestamp: new Date().toString()
      };

      setThreads(prev => prev.map(t => 
        t.id === activeChat 
          ? { ...t, messages: [...t.messages, errorMessage] }
          : t
      ));
    } finally {
      setIsTyping(false);
      console.log('=== HANDLE SEND MESSAGE END ===\n');
    }
  };

  const handleNewChat = () => {
    const newThread: ChatThread = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      lastUpdated: new Date().toString()
    };
    
    setThreads(prev => [newThread, ...prev]);
    setActiveChat(newThread.id);
    console.log('🆕 New chat:', newThread.id);
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChat(chatId);
    console.log('📌 Selected:', chatId);
  };

  const handleDeleteChat = (chatId: string) => {
    setThreads(prev => {
      const remaining = prev.filter(t => t.id !== chatId);
      if (activeChat === chatId) {
        setActiveChat(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  };

  const isWelcomeView = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <ChatSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onNewChat={handleNewChat}
        activeChat={activeChat}
        onSelectChat={handleSelectChat}
        chatHistory={threads.map(t => ({
          id: t.id,
          title: t.title,
          timestamp: t.lastUpdated,
          preview: t.messages.length 
            ? t.messages[t.messages.length - 1].content.slice(0, 80) 
            : 'No messages yet'
        }))}
        onDeleteChat={handleDeleteChat}
      />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {isWelcomeView ? (
          <ChatWelcome />
        ) : (
          <>
            <div className="border-b border-gray-200 px-6 py-3 bg-yellow-50">
              <p className="text-sm font-mono">
                🐛 DEBUG: Active chat: {activeChat} | Messages: {messages.length} | Threads: {threads.length}
              </p>
            </div>

            <div className="flex-1 overflow-hidden">
              <ScrollArea ref={scrollAreaRef} className="h-full">
                <div className="max-w-4xl mx-auto">
                  <div className="p-4 bg-blue-50 border-b">
                    <p className="text-xs font-mono">
                      Rendering {messages.length} messages from thread {activeChat}
                    </p>
                  </div>
                  
                  {messages.map((message, idx) => {
                    console.log(`🎨 Mapping message ${idx + 1}:`, message.id, message.role);
                    return (
                      <div key={message.id} className="border-b border-gray-100">
                        <div className="p-2 bg-gray-50">
                          <span className="text-xs font-mono text-gray-600">
                            Message {idx + 1}: {message.role} | {message.content?.slice(0, 30)}...
                          </span>
                        </div>
                        <ChatMessage message={message} />
                      </div>
                    );
                  })}
                  
                  <div ref={bottomRef} />
                  
                  {isTyping && (
                    <div className="p-6 bg-yellow-50">
                      <p className="text-sm">AI is typing...</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isTyping}
          isTyping={isTyping}
        />
      </div>
    </div>
  );
}