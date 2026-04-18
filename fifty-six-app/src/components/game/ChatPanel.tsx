import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useGameStore, ChatMessage } from '../../store/gameSlice';
import { useLobbyStore } from '../../store/lobbySlice';
import { useTransport } from '../../services/transportContext';

interface ChatPanelProps {
  onClose: () => void;
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const transport     = useTransport();
  const { chatMessages, markChatRead } = useGameStore();
  const { roomId, myPlayerId }         = useLobbyStore();
  const gameState = useGameStore((s) => s.gameState);
  const [text, setText]   = useState('');
  const listRef           = useRef<FlatList>(null);

  React.useEffect(() => {
    markChatRead();
  }, []);

  const handleSend = () => {
    const msg = text.trim();
    if (!msg || !roomId) return;
    transport.sendMessage({ roomId, message: msg });
    setText('');
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isMe = item.playerId === myPlayerId;
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        {!isMe && <Text style={styles.bubbleName}>{item.displayName}</Text>}
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.message}</Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Chat</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={chatMessages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Say something…"
          placeholderTextColor={Colors.textMuted}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn} disabled={!text.trim()}>
          <Text style={[styles.sendText, !text.trim() && styles.sendDisabled]}>›</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.bgCard,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  title:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  closeText: { fontSize: FontSize.md, color: Colors.textSecondary },

  list: { padding: Spacing.md, gap: Spacing.sm },

  bubble: {
    maxWidth:      '75%',
    padding:       Spacing.sm,
    borderRadius:  Radius.lg,
    backgroundColor: Colors.bgSurface,
    alignSelf:     'flex-start',
  },
  bubbleMe: {
    alignSelf:       'flex-end',
    backgroundColor: Colors.accent,
  },
  bubbleThem: {
    alignSelf:       'flex-start',
    backgroundColor: Colors.bgSurface,
  },
  bubbleName: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  bubbleText: { fontSize: FontSize.sm, color: Colors.textPrimary },
  bubbleTextMe: { color: '#fff' },

  inputRow: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.bgSurface,
    gap:            Spacing.sm,
  },
  input: {
    flex:              1,
    backgroundColor:   Colors.bg,
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    fontSize:          FontSize.sm,
    color:             Colors.textPrimary,
  },
  sendBtn:      { padding: Spacing.xs },
  sendText:     { fontSize: FontSize.xxl, color: Colors.accent },
  sendDisabled: { opacity: 0.3 },
});
