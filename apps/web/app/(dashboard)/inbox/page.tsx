'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Send, 
  Mail, 
  MessageSquare, 
  Phone,
  Filter,
  MoreHorizontal,
  Reply,
  Archive,
  Flag
} from 'lucide-react';
import { useOrg } from '@/components/org/org-provider';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/posthog';

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  channel: 'sms' | 'email' | 'whatsapp';
  toAddr: string;
  fromAddr: string;
  body: string;
  meta?: any;
  createdAt: string;
}

export default function InboxPage() {
  const { currentOrg } = useOrg();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (currentOrg) {
      loadMessages();
    }
  }, [currentOrg, activeTab]);

  const loadMessages = async () => {
    if (!currentOrg) return;

    try {
      setLoading(true);
      const response = await api.getMessages({ 
        orgId: currentOrg.id,
        channel: activeTab === 'all' ? undefined : activeTab as any
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim() || !currentOrg) return;

    try {
      setSending(true);
      
      // Determine channel based on original message
      const channel = selectedMessage.channel === 'whatsapp' ? 'sms' : selectedMessage.channel;
      
      await api.sendMessage({
        to: selectedMessage.fromAddr,
        body: replyText,
        channel: channel as 'sms' | 'email',
        orgId: currentOrg.id,
      });

      // Track event
      trackEvent('message_sent', { 
        channel: channel, 
        orgId: currentOrg.id 
      });

      // Clear reply and refresh messages
      setReplyText('');
      loadMessages();
      
      // Show success message
      console.log('Message sent successfully');
    } catch (error) {
      console.error('Failed to send message:', error);
      // In sandbox mode, just log to console
      console.log('Sandbox mode: Message would be sent:', {
        to: selectedMessage.fromAddr,
        body: replyText,
        channel: selectedMessage.channel,
      });
      setReplyText('');
    } finally {
      setSending(false);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'whatsapp':
        return <Phone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getChannelColor = (channel: string) => {
    switch (channel) {
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'sms':
        return 'bg-green-100 text-green-800';
      case 'whatsapp':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getInitials = (address: string) => {
    return address.substring(0, 2).toUpperCase();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
            <p className="text-muted-foreground">
              Unified message center
            </p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
          <p className="text-muted-foreground">
            Unified message center
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Channel Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All Messages</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="sms">SMS</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Messages List */}
        <div className="space-y-4">
          {messages.map((message) => (
            <Card 
              key={message.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                selectedMessage?.id === message.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedMessage(message)}
            >
              <CardContent className="p-4">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getInitials(message.fromAddr)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">
                          {message.fromAddr}
                        </span>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getChannelColor(message.channel)}`}
                        >
                          {getChannelIcon(message.channel)}
                          <span className="ml-1 capitalize">{message.channel}</span>
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-muted-foreground">
                          {formatTime(message.createdAt)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {message.body}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {messages.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No messages found</h3>
                <p className="text-muted-foreground text-center">
                  Messages from your contacts will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Message Detail & Reply */}
        {selectedMessage ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getInitials(selectedMessage.fromAddr)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{selectedMessage.fromAddr}</CardTitle>
                    <CardDescription className="flex items-center space-x-2">
                      {getChannelIcon(selectedMessage.channel)}
                      <span className="capitalize">{selectedMessage.channel}</span>
                      <span>•</span>
                      <span>{formatTime(selectedMessage.createdAt)}</span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon">
                    <Flag className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{selectedMessage.body}</p>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Reply</h4>
                <div className="space-y-2">
                  <Input
                    placeholder="Type your reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                    <Button 
                      onClick={handleSendReply}
                      disabled={!replyText.trim() || sending}
                      size="sm"
                    >
                      {sending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select a message</h3>
              <p className="text-muted-foreground text-center">
                Choose a message from the list to view details and reply
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
