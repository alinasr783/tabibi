-- ============================================
-- اسأل Tabibi - جداول الشات
-- ============================================

-- جدول المحادثات
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    clinic_id TEXT NOT NULL,
    title TEXT DEFAULT 'محادثة جديدة',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE
);

-- جدول الرسائل
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_clinic_id ON chat_conversations(clinic_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view their own conversations"
ON chat_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
ON chat_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
ON chat_conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
ON chat_conversations FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages from their conversations"
ON chat_messages FOR SELECT
USING (
    conversation_id IN (
        SELECT id FROM chat_conversations WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can create messages in their conversations"
ON chat_messages FOR INSERT
WITH CHECK (
    conversation_id IN (
        SELECT id FROM chat_conversations WHERE user_id = auth.uid()
    )
);

-- Function to update conversation updated_at on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_conversations 
    SET updated_at = NOW() 
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update conversation timestamp
DROP TRIGGER IF EXISTS update_conversation_on_message ON chat_messages;
CREATE TRIGGER update_conversation_on_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- Function to auto-generate conversation title from first message
CREATE OR REPLACE FUNCTION generate_conversation_title()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update title if it's the first user message and title is default
    IF NEW.role = 'user' THEN
        UPDATE chat_conversations 
        SET title = LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
        WHERE id = NEW.conversation_id 
        AND title = 'محادثة جديدة';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate title
DROP TRIGGER IF EXISTS auto_generate_title ON chat_messages;
CREATE TRIGGER auto_generate_title
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION generate_conversation_title();
