require("dotenv").config();
const express = require("express");
const WebSocket = require("ws");
const path = require("path");
const { graph, primitives, telemetry } = require("@inworld/framework-nodejs");
const { v4: uuidv4 } = require("uuid");
const WavEncoder = require("wav-encoder");

const app = express();
const port = 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// Parse environment variables
function parseEnvironmentVariables() {
  if (!process.env.INWORLD_API_KEY) {
    throw new Error("INWORLD_API_KEY env variable is required");
  }

  return {
    apiKey: process.env.INWORLD_API_KEY,
    llmModelName:
      process.env.LLM_MODEL_NAME || "meta-llama/Llama-3.1-70b-Instruct",
    llmProvider: process.env.LLM_PROVIDER || "inworld",
    voiceId: process.env.VOICE_ID,
  };
}

// Stacy Chen NPC configuratio
const STACY_CONFIG = {
  id: uuidv4(),
  name: "Stacy Chen",
  description:
    "A friendly 34-year-old passenger from Seattle taking a taxi ride. She's chatty and personable, enjoys chatting with drivers during rides. Curious about people and asks thoughtful questions.",
  motivation:
    "Taking a taxi across town and prefers friendly conversation to sitting in silence. She's genuinely interested in hearing about the driver's experiences and sharing stories about her travels.",
};

// Add this initial greeting
const initialGreeting = "Hi! heading downtown. How's your day going so far?";

// Text generation configuration
const TEXT_CONFIG = {
  maxNewTokens: 200,
  maxPromptLength: 1000,
  repetitionPenalty: 1,
  topP: 0.8,
  temperature: 0.8,
  frequencyPenalty: 0,
  presencePenalty: 0,
  stopSequences: ["\n\n"],
};

// Custom node for processing conversation input
class ConversationNode extends graph.CustomNode {
  constructor(id, connections) {
    super(id);
    this.input = graph.CustomInputDataType.TEXT;
    this.output = graph.CustomOutputDataType.CHAT_MESSAGES;
    this.connections = connections;
  }

  async process(inputs) {
    const data = JSON.parse(inputs[0]);
    const connection = this.connections[data.key];

    if (!connection) {
      throw new Error("Connection not found");
    }

    // Add user message to conversation history
    connection.state.messages.push({
      role: "user",
      content: data.text,
    });

    // Create system message with character context
    const systemMessage = {
      role: "system",
      content: `You are ${connection.state.agent.name}. ${connection.state.agent.description}\n\nCurrent situation: ${connection.state.agent.motivation}\n\nRespond as ${connection.state.agent.name} in character. Keep responses conversational and under 100 words.`,
    };

    // Return chat messages format expected by LLM node
    const messages = [systemMessage, ...connection.state.messages.slice(-10)];

    return messages;
  }
}

// Helper function to create TTS node with timeout and retry logic
async function createTTSNodeWithRetry(
  config,
  maxRetries = 2,
  timeoutMs = 15000
) {
  const { NodeFactory } = graph;
  const { SpeechSynthesisConfig } = primitives.tts;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Creating TTS node (attempt ${attempt}/${maxRetries})`);

      // Create a promise that will timeout
      const ttsPromise = NodeFactory.createRemoteTTSNode({
        id: `TTSNode_${uuidv4()}`,
        ttsConfig: {
          apiKey: config.apiKey,
          synthesisConfig: SpeechSynthesisConfig.getDefault(),
        },
        executionConfig: {
          speakerId: config.voiceId,
          synthesisConfig: SpeechSynthesisConfig.getDefault(),
        },
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("TTS node creation timeout")),
          timeoutMs
        );
      });

      const ttsNode = await Promise.race([ttsPromise, timeoutPromise]);
      console.log("TTS node created successfully");
      return ttsNode;
    } catch (error) {
      console.error(
        `TTS node creation attempt ${attempt} failed:`,
        error.message
      );

      if (attempt === maxRetries) {
        throw new Error(
          `Failed to create TTS node after ${maxRetries} attempts`
        );
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Create conversation graph with fallback options
async function createConversationGraph(config, connections, enableTTS = true) {
  const { Graph, NodeFactory } = graph;

  // Create nodes
  const conversationNode = new ConversationNode(
    "ConversationNode",
    connections
  ).build();

  const llmNode = await NodeFactory.createRemoteLLMNode({
    id: "LLMNode",
    llmConfig: {
      modelName: config.llmModelName,
      provider: config.llmProvider,
      apiKey: config.apiKey,
    },
    executionConfig: {
      textGenerationConfig: TEXT_CONFIG,
    },
    stream: true,
  });

  const conversationGraph = new Graph("CabChatGraph");
  conversationGraph.addNode(conversationNode);
  conversationGraph.addNode(llmNode);
  conversationGraph.addEdge(conversationNode, llmNode);

  if (enableTTS && config.voiceId) {
    try {
      // Try to create TTS pipeline
      const textChunkingNode = NodeFactory.createTextChunkingNode({
        id: "TextChunkingNode",
      });

      const ttsNode = await createTTSNodeWithRetry(config);

      conversationGraph.addNode(textChunkingNode);
      conversationGraph.addNode(ttsNode);
      conversationGraph.addEdge(llmNode, textChunkingNode);
      conversationGraph.addEdge(textChunkingNode, ttsNode);
      conversationGraph.setStartNode(conversationNode);
      conversationGraph.setEndNode(ttsNode);

      console.log("Graph created with TTS enabled");
      return {
        graph: conversationGraph,
        nodes: [conversationNode, llmNode, textChunkingNode, ttsNode],
        ttsEnabled: true,
      };
    } catch (error) {
      console.warn(
        "Failed to create TTS nodes, falling back to text-only:",
        error.message
      );
    }
  }

  // Fallback to text-only mode
  conversationGraph.setStartNode(conversationNode);
  conversationGraph.setEndNode(llmNode);

  console.log("Graph created in text-only mode");
  return {
    graph: conversationGraph,
    nodes: [conversationNode, llmNode],
    ttsEnabled: false,
  };
}

class CabChatApp {
  constructor() {
    this.config = null;
    this.connections = {};
    this.conversationGraph = null;
    this.ttsEnabled = false;
  }

  async initialize() {
    this.config = parseEnvironmentVariables();

    // Initialize telemetry
    telemetry.init({
      appName: "CabChat",
      appVersion: "1.0.0",
      apiKey: this.config.apiKey,
    });

    try {
      // Create the conversation graph
      this.conversationGraph = await createConversationGraph(
        this.config,
        this.connections,
        true // Try to enable TTS
      );

      this.ttsEnabled = this.conversationGraph.ttsEnabled;

      if (this.ttsEnabled) {
        console.log("CabChat initialized successfully with TTS");
      } else {
        console.log("CabChat initialized in text-only mode");
      }
    } catch (error) {
      console.error("Failed to initialize CabChat:", error);
      throw error;
    }
  }

  createSession(key, userName = "Passenger") {
    this.connections[key] = {
      state: {
        agent: STACY_CONFIG,
        userName: userName,
        messages: [],
      },
      ws: null,
    };

    return this.connections[key];
  }

  removeSession(key) {
    if (this.connections[key]) {
      delete this.connections[key];
    }
  }

  async processMessage(key, text) {
    const input = JSON.stringify({
      text: text,
      key: key,
    });

    const executionId = uuidv4();
    const outputStream = await this.conversationGraph.graph.execute(
      input,
      executionId
    );

    return { outputStream, executionId };
  }

  // Generate TTS separately when the main graph doesn't have TTS
  async generateTTSForText(text, ws) {
    if (!this.config.voiceId) {
      console.log("No voice ID configured, skipping TTS");
      return;
    }

    try {
      const ttsNode = await createTTSNodeWithRetry(this.config, 1, 10000);

      const { Graph } = graph;
      const simpleGraph = new Graph("SimpleTTSGraph");
      simpleGraph.addNode(ttsNode);
      simpleGraph.setStartNode(ttsNode);
      simpleGraph.setEndNode(ttsNode);

      const outputStream = await simpleGraph.execute(text, uuidv4());
      const ttsStream = (await outputStream.next()).data;

      if (ttsStream?.next) {
        let chunk = await ttsStream.next();
        while (!chunk.done) {
          if (chunk.audio) {
            try {
              const audioBuffer = await WavEncoder.encode({
                sampleRate: chunk.audio.sampleRate || 16000,
                channelData: [new Float32Array(chunk.audio.data)],
              });

              const base64Audio = Buffer.from(audioBuffer).toString("base64");
              ws.send(
                JSON.stringify({
                  type: "audio",
                  audio: base64Audio,
                })
              );
            } catch (audioError) {
              console.error("Error encoding audio:", audioError);
            }
          }
          chunk = await ttsStream.next();
        }
      }

      simpleGraph.closeExecution(outputStream);
      simpleGraph.destroy();
      ttsNode.destroy();
    } catch (error) {
      console.error("Failed to generate TTS:", error.message);
    }
  }

  shutdown() {
    if (this.conversationGraph) {
      this.conversationGraph.graph.destroy();
      this.conversationGraph.nodes.forEach((node) => node.destroy());
    }
    this.connections = {};
    telemetry.shutdown();
  }
}

const server = app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// WebSocket server
const wss = new WebSocket.Server({ server });

const cabChatApp = new CabChatApp();

wss.on("connection", (ws) => {
  console.log("Client connected");
  let sessionKey = null;

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "start") {
        await handleStartConversation(ws, data);
      } else if (data.type === "stop") {
        await handleStopConversation();
      } else if (data.type === "user_message" || data.type === "message") {
        await handleUserMessage(data.text);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      ws.send(
        JSON.stringify({
          type: "status",
          message: "Error: " + error.message,
        })
      );
    }
  });

  async function handleStartConversation(ws, data) {
    try {
      if (!cabChatApp.config) {
        throw new Error("App not initialized");
      }

      sessionKey = uuidv4();
      const connection = cabChatApp.createSession(
        sessionKey,
        data.userName || "Passenger"
      );
      connection.ws = ws;

      const statusMessage = cabChatApp.ttsEnabled
        ? "Connected! Stacy is ready to chat with voice"
        : "Connected! Stacy is ready to chat (text-only mode)";

      ws.send(
        JSON.stringify({
          type: "status",
          message: statusMessage,
        })
      );

      // Send initial greeting

      // Add greeting to conversation history immediately
      cabChatApp.connections[sessionKey].state.messages.push({
        role: "assistant",
        content: initialGreeting,
      });

      // Send greeting to transcript immediately
      ws.send(
        JSON.stringify({
          type: "transcript",
          text: initialGreeting,
          isUser: false,
        })
      );

      // Generate audio for the greeting if TTS is not in main pipeline
      if (!cabChatApp.ttsEnabled) {
        setTimeout(async () => {
          await cabChatApp.generateTTSForText(initialGreeting, ws);
        }, 500);
      }
    } catch (error) {
      console.error("Failed to start conversation:", error);
      ws.send(
        JSON.stringify({
          type: "status",
          message: "Failed to connect: " + error.message,
        })
      );
    }
  }

  async function handleUserMessage(text) {
    if (!sessionKey || !cabChatApp.connections[sessionKey]) {
      throw new Error("No active session");
    }

    try {
      // Validate input text has English letters/digits for TTS
      const cleanText = text.trim();
      if (!cleanText || !/[a-zA-Z0-9]/.test(cleanText)) {
        ws.send(
          JSON.stringify({
            type: "error",
            message:
              "Please enter a message with at least one letter or number.",
          })
        );
        return;
      }

      // Send user message to transcript
      ws.send(
        JSON.stringify({
          type: "transcript",
          text: cleanText,
          isUser: true,
        })
      );

      console.log("Processing user message:", cleanText);

      const { outputStream, executionId } = await cabChatApp.processMessage(
        sessionKey,
        cleanText
      );
      console.log("Got output stream from graph");

      if (cabChatApp.ttsEnabled) {
        // Handle TTS-enabled pipeline
        const ttsStreamWrapper = await outputStream.next();
        const ttsStream = ttsStreamWrapper.data;

        if (ttsStream?.next) {
          let chunk = await ttsStream.next();
          let fullResponse = "";
          let sentenceBuffer = "";

          while (!chunk.done) {
            if (chunk.text && typeof chunk.text === "string") {
              const chunkText = chunk.text;
              fullResponse += chunkText;
              sentenceBuffer += chunkText;

              // Check if we have a complete sentence
              if (
                sentenceBuffer.match(/[.!?]\s*$/) ||
                sentenceBuffer.includes("\n")
              ) {
                ws.send(
                  JSON.stringify({
                    type: "transcript",
                    text: sentenceBuffer.trim(),
                    isUser: false,
                  })
                );
                sentenceBuffer = "";
              }
            }

            if (chunk.audio) {
              try {
                const audioBuffer = await WavEncoder.encode({
                  sampleRate: chunk.audio.sampleRate || 16000,
                  channelData: [new Float32Array(chunk.audio.data)],
                });

                const base64Audio = Buffer.from(audioBuffer).toString("base64");
                ws.send(
                  JSON.stringify({
                    type: "audio",
                    audio: base64Audio,
                  })
                );
              } catch (audioError) {
                console.error("Error processing audio:", audioError);
              }
            }

            chunk = await ttsStream.next();
          }

          // Send any remaining text
          if (sentenceBuffer.trim()) {
            ws.send(
              JSON.stringify({
                type: "transcript",
                text: sentenceBuffer.trim(),
                isUser: false,
              })
            );
          }

          // Add assistant response to conversation history
          if (fullResponse.trim()) {
            cabChatApp.connections[sessionKey].state.messages.push({
              role: "assistant",
              content: fullResponse.trim(),
            });
          }
        }
      } else {
        // Handle text-only pipeline
        const textStreamWrapper = await outputStream.next();
        const textStream = textStreamWrapper.data;

        if (textStream?.next) {
          let chunk = await textStream.next();
          let fullResponse = "";

          while (!chunk.done) {
            if (chunk.text && typeof chunk.text === "string") {
              fullResponse += chunk.text;
            }
            chunk = await textStream.next();
          }

          if (fullResponse.trim()) {
            // Send text response
            ws.send(
              JSON.stringify({
                type: "transcript",
                text: fullResponse.trim(),
                isUser: false,
              })
            );

            // Add to conversation history
            cabChatApp.connections[sessionKey].state.messages.push({
              role: "assistant",
              content: fullResponse.trim(),
            });

            // Generate TTS separately
            setTimeout(async () => {
              await cabChatApp.generateTTSForText(fullResponse.trim(), ws);
            }, 100);
          }
        }
      }

      cabChatApp.conversationGraph.graph.closeExecution(outputStream);
      console.log("Closed execution stream");
    } catch (error) {
      console.error("Error handling user message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Error processing message: " + error.message,
        })
      );
    }
  }

  async function handleStopConversation() {
    if (sessionKey) {
      cabChatApp.removeSession(sessionKey);
      sessionKey = null;
      console.log("Conversation stopped");
    }
  }

  ws.on("close", () => {
    console.log("Client disconnected");
    handleStopConversation();
  });
});

// Initialize the app
cabChatApp.initialize().catch(console.error);

// Handle graceful shutdown
function shutdown() {
  console.log("Shutting down gracefully");
  cabChatApp.shutdown();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
