import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
  useParams,
  useNavigate,
} from "react-router-dom";
import { io } from "socket.io-client";
import { Sun, Moon, Menu, MessageSquare, ArrowUpIcon, ShareIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";

const socket = io("https://chatgpttroll.onrender.com");

socket.on("connect", () => {
  console.log("Connected to Socket.IO server:", socket.id);
  const roomId = window.location.pathname.split("/").pop();
  socket.emit("joinRoom", roomId);
});

socket.on("disconnect", () => {
  console.log("Disconnected from Socket.IO server");
});

const Chat = ({ isDarkMode, toggleDarkMode }) => {
  const { roomId } = useParams();
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    socket.emit("getMessages", roomId);

    const handleChatHistory = (messages) => {
      setChat(messages);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleQuestion = ({ roomId: receivedRoomId, msg }) => {
      if (receivedRoomId === roomId) {
        setChat((prevChat) => {
          const newChat = [...prevChat, { role: "asker", message: msg }];
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
          return newChat;
        });
      }
    };

    const handleResponse = ({ roomId: receivedRoomId, msg }) => {
      if (receivedRoomId === roomId) {
        setChat((prevChat) => {
          const newChat = [...prevChat, { role: "responder", message: msg }];
          chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
          return newChat;
        });
      }
    };

    const handleRoomDeleted = ({ roomId }) => {
      console.log(`Room ${roomId} has been deleted`);
      toast.success(`Room ${roomId} has been deleted`);
      navigate("/");
    };

    const handleTyping = () => {
      setIsTyping(true);
    };

    const handleStopTyping = () => {
      setIsTyping(false);
    };

    socket.on("chatHistory", handleChatHistory);
    socket.on("question", handleQuestion);
    socket.on("response", handleResponse);
    socket.on("roomDeleted", handleRoomDeleted);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("chatHistory", handleChatHistory);
      socket.off("question", handleQuestion);
      socket.off("response", handleResponse);
      socket.off("roomDeleted", handleRoomDeleted);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [roomId]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      const role = window.location.pathname.includes("/chat/")
        ? "responder"
        : "asker";
      socket.emit(role === "responder" ? "response" : "question", {
        roomId,
        msg: message,
      });
      setMessage("");
      socket.emit("stopTyping", { roomId });
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    socket.emit("typing", { roomId });
  };

  const shareChat = () => {
    const shareData = {
        title: 'Chat',
        text: 'Check out this chat!',
        url: window.location.href,
    };

    if (navigator.share) {
        navigator.share(shareData).catch(console.error);
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(shareData.url).then(() => {
            toast.success("Link copied to clipboard!");
        }).catch(err => {
            toast.error("Could not copy text...");
        });
    }
};
  return (
    <div
      className={`flex flex-col h-screen ${
        isDarkMode ? "bg-[#171717] text-white" : "bg-white text-gray-800"
      }`}
    >
      <header
        className={`flex justify-between items-center p-4 border-b ${
          isDarkMode ? "border-[#2f2f2f]" : "border-gray-200"
        }`}
      >
        <button
          className={`p-2 rounded-md ${
            isDarkMode ? "hover:bg-[#2f2f2f]" : "hover:bg-gray-100"
          }`}
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-semibold">New chat</h1>

        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.2, rotate: 360 }}
            whileTap={{ scale: 0.9 }}
            className="share-button p-2 bg-blue-500 text-white rounded-full"
            onClick={shareChat}
          >
            <ShareIcon size={20} />
          </motion.button>
          <div className="flex items-center space-x-4">
            <span>Theme</span>
            <div
              className={`relative w-16 h-8  flex items-center bg-gray-300 rounded-full p-1 cursor-pointer ${
                isDarkMode ? "bg-gray-600" : "bg-gray-300"
              }`}
              onClick={toggleDarkMode}
            >
              <motion.div
                className="w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center"
                animate={{ x: isDarkMode ? 32 : 0 }}
                transition={{ type: "spring", stiffness: 700, damping: 30 }}
              >
                {isDarkMode ? (
                  <Sun size={18} className="text-yellow-500" />
                ) : (
                  <Moon size={18} className="text-blue-500" />
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </header>
      <main className="w-9/12 mx-auto flex-1 overflow-auto p-4 space-y-5 hide-scrollbar scroll-smooth ">
        <AnimatePresence>
          {chat.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className={`flex ${
                msg.role === "responder" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-3/4 p-3 rounded-lg ${
                  msg.role === "responder"
                    ? isDarkMode
                      ? "bg-[#2f2f2f] text-white"
                      : "bg-gray-100 text-gray-800"
                    : isDarkMode
                    ? "bg-[#6c71ff] text-white"
                    : "bg-blue-500 text-white"
                } ${msg.role === "responder" ? "text-left" : "text-right"}`}
              >
                {msg.message}
              </div>
            </motion.div>
          ))}

          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="flex justify-start"
            >
              <div
                className={`max-w-3/4 p-3 rounded-lg ${
                  isDarkMode
                    ? "bg-[#2f2f2f] text-white"
                    : "bg-gray-100 text-gray-800"
                } text-left`}
              >
                <div className="flex items-center space-x-2">
                  <div className="typing-dot bg-gray-400 rounded-full w-2 h-2 animate-bounce"></div>
                  <div className="typing-dot bg-gray-400 rounded-full w-2 h-2 animate-bounce delay-700"></div>
                  <div className="typing-dot bg-gray-400 rounded-full w-2 h-2 animate-bounce delay-1000"></div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </main>
      <form
        onSubmit={sendMessage}
        className={`p-4 border-t ${
          isDarkMode ? "border-[#2f2f2f]" : "border-gray-200"
        }`}
      >
        <div className="flex items-center w-6/12 mx-auto space-x-2">
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className={`flex-1 py-3 px-4 rounded-3xl ${
              isDarkMode
                ? "bg-[#2f2f2f] text-white border-[#676767]"
                : "bg-white text-gray-800 border-gray-300"
            } border`}
          />
          <button
            type="submit"
            className={`p-3 rounded-full ${
              isDarkMode
                ? "bg-white text-black hover:bg-slate-200"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
          >
            <ArrowUpIcon size={22} fontWeight={900} />
          </button>
        </div>
      </form>
      <div
        className={`text-center p-2 text-sm hidden md:block ${
          isDarkMode ? "text-[#9b9b9b]" : "text-gray-500"
        }`}
      >
        ChatGPT can make mistakes. Check important info.
      </div>
    </div>
  );
};

const Responder = ({ isDarkMode, toggleDarkMode }) => {
  const [activeRooms, setActiveRooms] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    socket.emit("getRooms");

    socket.on("roomsList", (roomsList) => {
      console.log("Received rooms list:", roomsList);
      const formattedRooms = roomsList.reduce((acc, room) => {
        acc[room.id] = room.latestMessage;
        return acc;
      }, {});
      setActiveRooms(formattedRooms);
    });

    const handleQuestion = ({ roomId, msg }) => {
      console.log("Received question:", msg);
      setActiveRooms((prevActive) => ({
        ...prevActive,
        [roomId]: msg,
      }));
    };

    socket.on("question", handleQuestion);
    socket.on("getRooms", () => {
      socket.emit("getRooms");
    });

    return () => {
      socket.off("roomsList");
      socket.off("question", handleQuestion);
      socket.off("getRooms");
    };
  }, []);

  const handleRoomClick = (roomId) => {
    navigate(`/chat/${roomId}`);
  };

  const sendResponse = (roomId) => {
    navigate(`/chat/${roomId}`);
  };

  const deleteRoom = (roomId) => {
    console.log(`Deleting room: ${roomId}`);
    socket.emit("deleteRoom", roomId);
  };

  return (
    <div
      className={`flex flex-col h-screen ${
        isDarkMode ? "bg-[#171717] text-white" : "bg-white text-gray-800"
      }`}
    >
      <header
        className={`flex justify-between items-center p-4 border-b ${
          isDarkMode ? "border-[#2f2f2f]" : "border-gray-200"
        }`}
      >
        <h1 className="text-xl font-semibold">Responder Dashboard</h1>
        <button
          onClick={toggleDarkMode}
          className={`p-2 rounded-md ${
            isDarkMode ? "hover:bg-[#2f2f2f]" : "hover:bg-gray-100"
          }`}
        >
          {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </header>
      <main className="flex-1 overflow-auto p-4 space-y-4">
        <AnimatePresence>
          {Object.keys(activeRooms).length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center text-gray-500"
            >
              No active users at the moment.
            </motion.p>
          ) : (
            Object.keys(activeRooms).map((roomId) => (
              <motion.div
                key={roomId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`p-4 rounded-lg cursor-pointer ${
                  isDarkMode ? "hover:bg-[#2f2f2f]" : "hover:bg-gray-100"
                }`}
                onClick={() => handleRoomClick(roomId)}
              >
                <div className="flex items-center justify-between w-11/12 mx-auto">
                  <div className="flex items-center space-x-3">
                    <MessageSquare size={24} className="text-[#6c71ff]" />
                    <div>
                      <h2 className="font-semibold">{roomId}</h2>
                      <p
                        className={`text-sm ${
                          isDarkMode ? "text-[#9b9b9b]" : "text-gray-500"
                        }`}
                      >
                        {activeRooms[roomId] || "No messages yet"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-3 py-1 rounded-md font-semibold ${
                        isDarkMode
                          ? "bg-[#6c71ff] text-white hover:bg-[#5a5fd7]"
                          : "bg-green-500 text-white hover:bg-green-600"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        sendResponse(roomId);
                      }}
                    >
                      Respond
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={`px-3 py-1 rounded-md bg-red-500 border-red-800  text-white font-semibold`}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteRoom(roomId);
                      }}
                    >
                      Delete
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

const App = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const roomId = getRoomIdForUser();

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <Router>
      <div className={`app-container ${isDarkMode ? "dark" : ""}`}>
        <Routes>
          <Route
            path="/"
            element={<Navigate to={`/user/${roomId}`} replace />}
          />
          <Route
            path="/user/:roomId"
            element={
              <Chat isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
            }
          />
          <Route
            path="/responder"
            element={
              <Responder
                isDarkMode={isDarkMode}
                toggleDarkMode={toggleDarkMode}
              />
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <Chat isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
            }
          />
          <Route
            path="*"
            element={<Navigate to={`/user/${roomId}`} replace />}
          />
        </Routes>
      </div>
      <Toaster/>
    </Router>
  );
};

const getRoomIdForUser = () => {
  return `room-${Math.random().toString(36).substr(2, 9)}`;
};

export default App;
