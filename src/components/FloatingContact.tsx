import React, { useState, useEffect, useRef } from "react";
import {
  Headset,
  ArrowUp,
  QrCode,
  Send,
  Loader2,
  X,
  Minus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/supabase";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import wxPng from "@/assets/wx.png";

interface Message {
  id: string;
  conversation_id: string;
  sender_type: "user" | "admin";
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Conversation {
  id: string;
  user_id: string;
  status: "active" | "closed";
  created_at: string;
  updated_at: string;
}

export function FloatingContact() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    // Check auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
      subscription.unsubscribe();
    };
  }, []);

  // Load conversation and messages when support opens
  useEffect(() => {
    if (isSupportOpen && user) {
      loadConversation();
    }
  }, [isSupportOpen, user]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversation) return;

    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation]);

  const loadConversation = async () => {
    if (!user) return;

    setIsLoadingMessages(true);
    try {
      // Get or create conversation
      let { data: existingConv, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (convError && convError.code !== "PGRST116") {
        throw convError;
      }

      if (!existingConv) {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from("conversations")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) throw createError;
        existingConv = newConv;
      }

      setConversation(existingConv);

      // Load messages
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", existingConv.id)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);
    } catch (error) {
      console.error("Error loading conversation:", error);
      toast.error(t("something_went_wrong"));
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleSupportClick = () => {
    if (!user) {
      toast.warning(t("login_required_for_support"));
      navigate("/login");
      return;
    }
    setIsSupportOpen(true);
    setIsMinimized(false);
  };

  const handleClose = () => {
    setIsSupportOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversation) return;

    const messageContent = message.trim();
    setMessage(""); // Clear input immediately
    setIsSubmitting(true);

    // Optimistic UI update - add message to local state immediately
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversation.id,
      sender_type: "user",
      sender_id: user.id,
      content: messageContent,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          sender_type: "user",
          sender_id: user.id,
          content: messageContent,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one from database
      if (data) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === optimisticMessage.id ? data : msg))
        );
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(t("something_went_wrong"));
      // Remove optimistic message on error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      );
      setMessage(messageContent); // Restore message in input
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed right-4 bottom-20 z-50 flex flex-col gap-3">
        {/* Permanent QR Code Card */}
        <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 w-32 flex flex-col items-center gap-2 mb-2">
          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100 text-center">
            {t("scan_qr_code")}
          </span>
          <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center overflow-hidden">
            <img
              src={wxPng}
              alt="WeChat QR Code"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Customer Support Button */}
        {!isSupportOpen && (
          <div className="relative group">
            <button
              onClick={handleSupportClick}
              className="w-12 h-12 bg-white dark:bg-zinc-900 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all duration-300"
            >
              <Headset className="w-5 h-5" />
            </button>
            <div className="absolute right-full top-1/2 -translate-y-1/2 mr-3 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-xs font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 whitespace-nowrap">
              {t("contact_support")}
              <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-4 border-transparent border-l-zinc-900 dark:border-l-white"></div>
            </div>
          </div>
        )}

        {/* Back to Top Button */}
        <button
          onClick={scrollToTop}
          className={`w-12 h-12 bg-white dark:bg-zinc-900 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-600 dark:hover:border-indigo-400 transition-all duration-300 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Widget */}
      {isSupportOpen && (
        <div
          ref={chatRef}
          className={`fixed right-4 bottom-4 z-50 w-[360px] bg-white dark:bg-zinc-900 rounded-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-all duration-300 ease-in-out ${
            isMinimized ? "h-[48px]" : "h-[520px]"
          }`}
        >
          {/* Header */}
          <div
            className="bg-blue-600 px-4 py-3 flex items-center justify-between cursor-pointer"
            onClick={handleMinimize}
          >
            <div className="flex items-center gap-2 text-white">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                <Headset className="w-3.5 h-3.5" />
              </div>
              <span className="font-medium text-sm">
                {t("contact_support")}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMinimize();
                }}
                className="p-1 hover:bg-white/10 rounded text-white/80 hover:text-white transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                className="p-1 hover:bg-white/10 rounded text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          <div className="flex flex-col h-[calc(520px-48px)]">
            {/* Messages Area */}
            <div className="flex-1 bg-zinc-50 dark:bg-zinc-950/50 p-4 overflow-y-auto">
              {isLoadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                    <Headset className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="bg-white dark:bg-zinc-900 p-3 rounded-2xl rounded-tl-none border border-zinc-100 dark:border-zinc-800 shadow-sm text-sm text-zinc-600 dark:text-zinc-300">
                    {t("contact_support_desc")}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${
                        msg.sender_type === "user" ? "flex-row-reverse" : ""
                      }`}
                    >
                      {msg.sender_type === "admin" && (
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <Headset className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-2xl border shadow-sm text-sm max-w-[75%] ${
                          msg.sender_type === "user"
                            ? "bg-blue-600 text-white border-blue-600 rounded-tr-none"
                            : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 border-zinc-100 dark:border-zinc-800 rounded-tl-none"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
              <form onSubmit={handleSubmitSupport} className="relative">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t("support_message_placeholder")}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none h-[42px] min-h-[42px] max-h-[100px]"
                  style={{ minHeight: "42px" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitSupport(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !message.trim()}
                  className="absolute right-2 top-3/7 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                </button>
              </form>
              <div className="text-[10px] text-center text-zinc-400 mt-2">
                Powered by Lumina Support
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
