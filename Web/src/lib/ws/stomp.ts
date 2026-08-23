/**
 * 채팅 WebSocket. Flutter의 stomp_dart_client 대응.
 *
 * 백엔드 WebSocketConfig:
 *   endpoint      : /ws/chat  (SockJS)
 *   broker prefix : /topic, /queue
 *   app prefix    : /app
 *
 * 1:1 채팅   → 전송 /app/chat/{roomId},           구독 /topic/chat/{roomId}
 * 동행 그룹  → 전송 /app/companion-chat/{id},     구독 /topic/companion-chat/{id}
 */
import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { API_BASE_URL, AuthStorage } from "@/lib/api/client";

export interface StompConnection {
  send: (destination: string, body: unknown) => void;
  disconnect: () => void;
}

interface ConnectOptions<T> {
  /** 구독할 destination (예: /topic/chat/{roomId}) */
  topic: string;
  onMessage: (payload: T) => void;
  onStatus?: (status: "connecting" | "connected" | "disconnected" | "error") => void;
}

export function connectStomp<T>({ topic, onMessage, onStatus }: ConnectOptions<T>): StompConnection {
  const token = AuthStorage.getToken();

  const client = new Client({
    // SockJS는 http(s) URL을 쓴다 (ws:// 아님)
    webSocketFactory: () => SockJS(`${API_BASE_URL}/ws/chat`) as unknown as WebSocket,
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      onStatus?.("connected");
      client.subscribe(topic, (message: IMessage) => {
        try {
          onMessage(JSON.parse(message.body) as T);
        } catch {
          /* 파싱 실패한 프레임은 무시 */
        }
      });
    },
    onWebSocketClose: () => onStatus?.("disconnected"),
    onStompError: () => onStatus?.("error"),
  });

  onStatus?.("connecting");
  client.activate();

  return {
    send: (destination, body) => {
      if (!client.connected) return;
      client.publish({ destination, body: JSON.stringify(body) });
    },
    disconnect: () => {
      void client.deactivate();
    },
  };
}
