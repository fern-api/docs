import { Conversation } from "@elevenlabs/client";

/**
 * Example: Starting a conversation with a public ElevenLabs agent
 *
 * This example demonstrates how to initialize and manage a conversation
 * session with an ElevenLabs conversational AI agent using the JavaScript SDK.
 */
async function startConversation() {
  // Request microphone access before starting the conversation
  await navigator.mediaDevices.getUserMedia({ audio: true });

  // Start a conversation session with a public agent
  const conversation = await Conversation.startSession({
    agentId: "<your-agent-id>",
    connectionType: "webrtc",

    // Called when the WebSocket connection is established
    onConnect: () => {
      console.log("Connected to the agent");
    },

    // Called when the connection is closed
    onDisconnect: () => {
      console.log("Disconnected from the agent");
    },

    // Called when a new message is received (transcriptions or LLM replies)
    onMessage: (message) => {
      console.log("Received message:", message);
    },

    // Called when an error occurs
    onError: (error) => {
      console.error("Conversation error:", error);
    },

    // Called when the connection status changes
    onStatusChange: (status) => {
      console.log("Status changed:", status);
    },

    // Called when the agent switches between speaking and listening
    onModeChange: (mode) => {
      console.log("Mode changed:", mode);
    },
  });

  return conversation;
}

/**
 * Example: Ending a conversation session
 *
 * Call endSession() to manually terminate the conversation
 * and disconnect from the WebSocket.
 */
async function endConversation(conversation) {
  await conversation.endSession();
  console.log("Conversation ended");
}

// Start the conversation when the page loads
startConversation()
  .then((conversation) => {
    console.log("Conversation started successfully");

    // End the conversation after 5 minutes
    setTimeout(() => {
      endConversation(conversation);
    }, 5 * 60 * 1000);
  })
  .catch((error) => {
    console.error("Failed to start conversation:", error);
  });
