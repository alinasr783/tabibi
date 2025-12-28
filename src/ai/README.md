# Tabibi AI System Documentation

This directory contains all AI-related functionality for the Tabibi application, organized into a clean structure for better maintainability and understanding.

## Directory Structure

### `services/` - Core AI Services
Contains the backend logic and data operations for the AI system:

- **aiActions.js** - Defines all executable actions that the AI can perform (patient creation, appointment scheduling, etc.)
  - Provides CRUD operations for patients, appointments, visits, and staff
  - Includes helper functions for data validation and processing
  - Handles patient gender guessing from Arabic names

- **aiContext.js** - Provides contextual data to the AI system
  - Fetches clinic statistics and patient data for AI responses
  - Supplies appointment, patient, and financial information to AI
  - Includes search and filtering capabilities for AI context

- **aiCore.js** - Core AI logic and processing functions
  - Contains main AI processing and response generation logic
  - Handles natural language processing and intent recognition
  - Manages conversation context and state 

- **aiSystemPrompt.js** - Defines the AI's system behavior and instructions
  - Contains the comprehensive system prompt that guides AI behavior
  - Defines available actions, UI components, and navigation options
  - Includes examples and usage patterns for the AI

- **aiUtils.js** - Utility functions for AI operations
  - Helper functions for data formatting and processing
  - Validation and sanitization utilities
  - Formatting functions for AI responses

- **apiAskTabibi.js** - API interface for AI functionality
  - Handles chat conversations and message storage
  - Manages conversation history and state
  - Provides interface between UI and AI services

### `ui/` - AI User Interface Components
Contains the frontend components for the AI chat interface:

- **AskTabibiPage.jsx** - Main AI chat interface page
  - Implements the complete chat UI with sidebar and message area
  - Handles action execution from AI responses
  - Manages patient creation dialog and navigation

- **ActionRenderer.jsx** - Renders AI actions as interactive UI components
  - Processes AI response segments (text, buttons, inputs, etc.)
  - Renders various action types (buttons, charts, forms, etc.)
  - Handles inline message rendering with icons and formatting

- **useChat.js** - Custom hook for chat functionality
  - Manages chat state, conversations, and messages
  - Handles message sending and receiving
  - Provides real-time updates and streaming responses

### `core/` - Core AI Logic (Placeholder)
Reserved for core AI algorithms and processing logic that may be added later.

## File Purposes and Functionality

### AI Actions (`aiActions.js`)
This file is the backbone of the AI system, defining what actions the AI can execute:
- Patient management (create, update, search)
- Appointment scheduling (create, update, cancel)
- Visit documentation (create, update)
- Staff management (add secretary)
- Clinic settings (hours, day-offs)

### AI Context (`aiContext.js`)
Provides the AI with real-time data about the clinic:
- Patient statistics and demographics
- Appointment schedules and availability
- Financial data and revenue tracking
- Clinic settings and preferences

### AI System Prompt (`aiSystemPrompt.js`)
Defines how the AI should behave and respond:
- Available actions and commands
- Proper Arabic language usage
- Context-aware responses
- Error handling and validation

### UI Components (`ActionRenderer.jsx`, `AskTabibiPage.jsx`)
Handle the presentation layer of AI interactions:
- Rendering AI responses with rich UI elements
- Processing action buttons and navigation
- Managing dialogs and forms triggered by AI
- Providing feedback and status updates

## Integration Points

The AI system integrates with various parts of the Tabibi application:
- Patient management system
- Appointment scheduling
- Financial tracking
- Clinic administration
- User authentication and permissions

## Usage Flow

1. User sends message to AI
2. AI processes message using system prompt and context
3. AI generates response with possible actions
4. Actions are rendered as interactive UI components
5. User interacts with components to execute actions
6. Results are fed back to update AI context