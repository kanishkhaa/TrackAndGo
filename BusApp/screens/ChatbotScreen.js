import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
  FlatList,
  Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { getChatbotReply } from '../src/utils/chatbot';
import LottieView from 'lottie-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Sidebar from '../components/Sidebar';
import { UserContext } from '../screens/UserContext';

// Available languages with proper names and script examples
const LANGUAGES = [
  { code: 'en', name: 'English', example: 'Hello' },
  { code: 'es', name: 'Spanish', example: 'Hola' },
  { code: 'fr', name: 'French', example: 'Bonjour' },
  { code: 'de', name: 'German', example: 'Hallo' },
  { code: 'it', name: 'Italian', example: 'Ciao' },
  { code: 'pt', name: 'Portuguese', example: 'Olá' },
  { code: 'ru', name: 'Russian', example: 'Привет' },
  { code: 'ja', name: 'Japanese', example: 'こんにちは' },
  { code: 'ko', name: 'Korean', example: '안녕하세요' },
  { code: 'zh', name: 'Chinese', example: '你好' },
  { code: 'hi', name: 'Hindi', example: 'नमस्ते' },
  { code: 'ta', name: 'Tamil', example: 'வணக்கம்' },
  { code: 'te', name: 'Telugu', example: 'హలో' },
  { code: 'kn', name: 'Kannada', example: 'ನಮಸ್ಕಾರ' },
  { code: 'ml', name: 'Malayalam', example: 'നമസ്കാരം' },
  { code: 'ar', name: 'Arabic', example: 'مرحبا' },
];

const { width, height } = Dimensions.get('window');

const ChatbotScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('chatbot');

  const scrollViewRef = useRef();
  const lottieRef = useRef(null);
  
  // Animation values
  const inputAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    if (lottieRef.current) {
      lottieRef.current.play();
    }
  }, []);

  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Clean Markdown stars from text
  const cleanMarkdown = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
               .replace(/\*(.*?)\*/g, '$1')   // Remove italic
               .replace(/`(.*?)`/g, '$1');    // Remove code
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { 
      id: Date.now().toString(),
      sender: 'user', 
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);
    
    Animated.sequence([
      Animated.timing(inputAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(inputAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const botReply = await getChatbotReply(input, language);
      const cleanedReply = cleanMarkdown(botReply);
      const botMessage = {
        id: Date.now().toString(),
        sender: 'bot', 
        text: cleanedReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      
      setMessages(prev => [...prev, botMessage]);
      // Auto-speak bot reply
      speakMessage(botMessage.id, cleanedReply);
    } catch (err) {
      const errorMessage = language === 'en' 
        ? 'Something went wrong. Please try again later.'
        : await getChatbotReply('Something went wrong. Please try again later.', language);
        
      const cleanedError = cleanMarkdown(errorMessage);
      setMessages(prev => [
        ...prev, 
        { 
          id: Date.now().toString(),
          sender: 'bot', 
          text: cleanedError,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const speakMessage = (messageId, text) => {
    Speech.stop();
    setSpeakingMessageId(messageId);

    // Language-specific arrow replacements for natural speech
    const arrowReplacements = {
      en: ' to ',
      es: ' a ',
      fr: ' à ',
      de: ' nach ',
      it: ' a ',
      pt: ' para ',
      ru: ' до ',
      ja: ' へ ',
      ko: ' 에게 ',
      zh: ' 到 ',
      hi: ' से ',
      ta: ' முதல் ',
      te: ' నుండి ',
      kn: ' ರಿಂದ ',
      ml: ' മുതൽ ',
      ar: ' إلى ',
    };

    // Replace arrows with language-specific phrase
    const cleanedText = text.replace(/→/g, arrowReplacements[language] || ' to ');

    const speechLanguageMap = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
      ru: 'ru-RU',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      ar: 'ar-SA',
    };
    
    Speech.speak(cleanedText, {
      language: speechLanguageMap[language] || 'en-US',
      onDone: () => setSpeakingMessageId(null),
      onError: () => setSpeakingMessageId(null),
    });
  };

  const handleMenuItemPress = (menuItem) => {
    setActiveMenuItem(menuItem);
    setSidebarVisible(false);
  };

  const handleSignOut = () => {
    setSidebarVisible(false);
    navigation.navigate('Onboarding');
  };

  const getLanguageName = (code) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? lang.name : code.toUpperCase();
  };

  const renderMessage = (msg) => (
    <Animated.View
      key={msg.id}
      style={[
        styles.message,
        msg.sender === 'user' ? styles.userMessage : styles.botMessage,
      ]}
    >
      {msg.sender === 'bot' && (
        <View style={styles.botAvatarContainer}>
          <LinearGradient
            colors={['#6a11cb', '#2575fc']}
            style={styles.botAvatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons name="robot" size={16} color="#FFFFFF" />
          </LinearGradient>
        </View>
      )}
      
      <View style={[
        styles.messageContentWrapper,
        msg.sender === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper,
      ]}>
        <Text style={[
          styles.messageText,
          msg.sender === 'user' ? styles.userMessageText : styles.botMessageText
        ]}>
          {msg.text}
        </Text>
        
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>{msg.timestamp}</Text>
          
          {msg.sender === 'bot' && (
            <TouchableOpacity
              onPress={() => {
                if (speakingMessageId === msg.id) {
                  Speech.stop();
                  setSpeakingMessageId(null);
                } else {
                  speakMessage(msg.id, msg.text);
                }
              }}
              style={styles.speakButton}
            >
              <Ionicons 
                name={speakingMessageId === msg.id ? "stop-circle" : "volume-high"} 
                size={16} 
                color="#6a11cb" 
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Animated.View>
  );

  const getLanguageExample = (code) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? lang.example : 'Hello';
  };

  const getPlaceholder = () => {
    const placeholders = {
      en: 'Type your message...',
      es: 'Escribe tu mensaje...',
      fr: 'Tapez votre message...',
      de: 'Nachricht eingeben...',
      it: 'Scrivi un messaggio...',
      pt: 'Digite sua mensagem...',
      ru: 'Введите сообщение...',
      ja: 'メッセージを入力...',
      ko: '메시지를 입력하세요...',
      zh: '输入消息...',
      hi: 'अपना संदेश लिखें...',
      ta: 'உங்கள் செய்தியை உள்ளிடவும்...',
      te: 'మీ సందేశాన్ని టైప్ చేయండి...',
      kn: 'ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ಟೈಪ್ ಮಾಡಿ...',
      ml: 'നിന്റെ സന്ദേശം ടൈപ്പ് ചെയ്യുക...',
      ar: 'اكتب رسالتك...',
    };
    
    return placeholders[language] || 'Type your message...';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      {/* Header */}
      <Animated.View 
        style={[styles.header, { opacity: fadeAnim }]}
      >
        <TouchableOpacity 
          onPress={() => setSidebarVisible(true)}
          style={styles.menuButton}
        >
          <Ionicons name="menu" size={24} color="#111827" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.languageButton}
          onPress={() => setLanguageModalVisible(true)}
        >
          <Text style={styles.languageButtonText}>
            {getLanguageName(language)}
          </Text>
          <Ionicons name="chevron-down" size={16} color="#6a11cb" />
        </TouchableOpacity>
      </Animated.View>

      {/* Sidebar */}
      <Sidebar
        visible={sidebarVisible}
        activeMenuItem={activeMenuItem}
        onClose={() => setSidebarVisible(false)}
        onMenuItemPress={handleMenuItemPress}
        onSignOut={handleSignOut}
      />

      {/* Chat Content */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatBox} 
        contentContainerStyle={styles.chatContent}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <LottieView
              ref={lottieRef}
              source={require('../assets/animations/hello-chat.json')}
              style={styles.lottieAnimation}
              autoPlay
              loop
            />
            <Text style={styles.emptyChatTitle}>Your Journey Assistant</Text>
            <Text style={styles.emptyChatText}>
            Ask me anything about bus routes, schedules, or tickets in {getLanguageName(language)}!
            </Text>
            
            <View style={styles.suggestionContainer}>
              <Text style={styles.suggestionTitle}>Try asking:</Text>
              <View style={styles.suggestionChips}>
                <TouchableOpacity 
                  style={styles.suggestionChip}
                  onPress={() => setInput('What are the bus routes available in my city?')}
                >
                  <Text style={styles.suggestionChipText}>Bus routes in my city</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.suggestionChip}
                  onPress={() => setInput('How can I book a bus ticket online?')}
                >
                  <Text style={styles.suggestionChipText}>Book a bus ticket</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.suggestionChip}
                  onPress={() => setInput('What are some tips for a comfortable bus journey?')}
                >
                  <Text style={styles.suggestionChipText}>Travel tips</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          messages.map(renderMessage)
        )}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <LinearGradient
              colors={['#f5f7fa', '#c3cfe2']}
              style={styles.typingIndicator}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </LinearGradient>
          </View>
        )}
      </ScrollView>

      {/* Input Box */}
      <Animated.View 
        style={[
          styles.inputBox,
          { transform: [{ translateY: inputAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 10]
            }) 
          }] }
        ]}
      >
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={getPlaceholder()}
          placeholderTextColor="#9CA3AF"
          returnKeyType="send"
          onSubmitEditing={handleSend}
          multiline
        />
        
        <View style={styles.inputButtons}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={22} color="#6a11cb" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={handleSend} 
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Language Selection Modal */}
      <Modal
        visible={languageModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLanguageModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={15} style={StyleSheet.absoluteFill} />
          <View style={styles.languageModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity 
                onPress={() => setLanguageModalVisible(false)}
                style={styles.closeModalButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={LANGUAGES}
              keyExtractor={(item) => item.code}
              numColumns={2}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.languageItem,
                    language === item.code && styles.selectedLanguageItem
                  ]}
                  onPress={() => {
                    setLanguage(item.code);
                    setLanguageModalVisible(false);
                  }}
                >
                  <View>
                    <Text style={[
                      styles.languageItemText,
                      language === item.code && styles.selectedLanguageItemText
                    ]}>
                      {item.name}
                    </Text>
                    <Text style={styles.languageExample}>
                      {item.example}
                    </Text>
                  </View>
                  {language === item.code && (
                    <Ionicons name="checkmark-circle" size={18} color="#6a11cb" />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.languageList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    letterSpacing: 0.5,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(106, 17, 203, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6a11cb',
    marginRight: 4,
  },
  chatBox: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  emptyChatTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 20,
  },
  emptyChatText: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 30,
    maxWidth: '80%',
  },
  suggestionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 12,
  },
  suggestionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  suggestionChip: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    margin: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestionChipText: {
    color: '#4B5563',
    fontSize: 14,
  },
  message: {
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  botMessage: {
    alignSelf: 'flex-start',
  },
  botAvatarContainer: {
    marginRight: 8,
    marginBottom: 15,
  },
  botAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContentWrapper: {
    padding: 14,
    borderRadius: 18,
    minWidth: 60,
    maxWidth: '96%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userMessageWrapper: {
    backgroundColor: '#6a11cb',
    borderBottomRightRadius: 4,
  },
  botMessageWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  botMessageText: {
    color: '#111827',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  speakButton: {
    padding: 4,
  },
  loadingContainer: {
    alignSelf: 'flex-start',
    marginVertical: 8,
    marginLeft: 36,
  },
  typingIndicator: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 16,
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6a11cb',
    marginHorizontal: 3,
    opacity: 0.6,
  },
  inputBox: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  input: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 15,
    color: '#111827',
    maxHeight: 100,
  },
  inputButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#6a11cb',
    borderRadius: 24,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#C4B5FD',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  languageModal: {
    width: width * 0.85,
    maxHeight: height * 0.7,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeModalButton: {
    padding: 4,
  },
  languageList: {
    padding: 16,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    marginHorizontal: 4,
    width: '48%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedLanguageItem: {
    backgroundColor: 'rgba(106, 17, 203, 0.08)',
    borderColor: '#6a11cb',
  },
  languageItemText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  languageExample: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  selectedLanguageItemText: {
    color: '#6a11cb',
    fontWeight: '600',
  },
});

export default ChatbotScreen;