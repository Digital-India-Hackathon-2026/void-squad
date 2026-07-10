import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { chatAPI } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { C } from '../lib/colors';

interface Message { role: 'user' | 'assistant'; content: string; }

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm DeCode.it Quickie 👋 Ask me anything about food labels, ingredients, or nutrition — I'll answer based on your health profile." },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const history = messages.slice(-12);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await chatAPI.send({ message: text, conversationHistory: history });
      const reply = res.data?.reply || res.data?.message || 'Sorry, I couldn\'t process that.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}><Text style={{ fontSize: 18 }}>⚡</Text></View>
        <View>
          <Text style={styles.headerTitle}>DeCode.it Quickie</Text>
          <Text style={styles.headerSub}>Instant food Q&A — powered by AI</Text>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
            <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={loading ? (
          <View style={[styles.bubble, styles.bubbleBot, { paddingVertical: 12 }]}>
            <ActivityIndicator size="small" color={C.primary} />
          </View>
        ) : null}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask about any food or ingredient..."
          placeholderTextColor={C.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]} onPress={send} disabled={!input.trim() || loading}>
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primary + '22', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: C.text, fontSize: 16, fontWeight: '700' },
  headerSub: { color: C.muted, fontSize: 12 },
  listContent: { padding: 16, gap: 10, paddingBottom: 8 },
  bubble: { maxWidth: '82%', borderRadius: 18, padding: 12 },
  bubbleUser: { backgroundColor: C.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: C.surface, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: C.border },
  bubbleText: { color: C.text, fontSize: 14, lineHeight: 21 },
  bubbleTextUser: { color: '#000' },
  inputRow: { flexDirection: 'row', gap: 10, padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.bg, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: C.text, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: C.border },
  sendBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.35 },
  sendIcon: { color: '#000', fontSize: 18, fontWeight: '700' },
});
