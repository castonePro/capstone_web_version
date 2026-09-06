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
  const baseUrl = API_BASE_URL.replace(/\/$/, "");

  // ws:// 또는 wss:// 로 시작하는 경우 순수 WebSocket 사용
  const isPureWs = baseUrl.startsWith("ws://") || baseUrl.startsWith("wss://");
  const wsUrl = isPureWs
    ? `${baseUrl}/ws/chat`
    : `${baseUrl.replace(/^http/, "ws")}/ws/chat`;

  const sockJsUrl = `${baseUrl.replace(/^ws/, "http")}/ws/chat`;

  const client = new Client({
    // 백엔드 명세: ws://<백엔드서버주소>:8080/ws/chat (또는 SockJS: http://.../ws/chat)
    ...(isPureWs
      ? { brokerURL: wsUrl }
      : {
          webSocketFactory: () => SockJS(sockJsUrl) as unknown as WebSocket,
        }),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: (str) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[STOMP]", str);
      }
    },
    onConnect: () => {
      onStatus?.("connected");
      client.subscribe(topic, (message: IMessage) => {
        try {
          onMessage(JSON.parse(message.body) as T);
        } catch (e) {
          if (process.env.NODE_ENV === "development") {
            console.error("[STOMP] JSON 파싱 실패:", e, message.body);
          }
        }
      });
    },
    onWebSocketClose: () => onStatus?.("disconnected"),
    onStompError: (frame) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[STOMP ERROR]", frame.headers["message"], frame.body);
      }
      onStatus?.("error");
    },
    onWebSocketError: (event) => {
      if (process.env.NODE_ENV === "development") {
        console.error("[WS ERROR]", event);
      }
      onStatus?.("error");
    },
  });

  onStatus?.("connecting");
  client.activate();

  return {
    send: (destination, body) => {
      if (!client.connected) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[STOMP] 연결되지 않은 상태에서 전송 시도됨:", destination, body);
        }
        return;
      }
      client.publish({ destination, body: JSON.stringify(body) });
    },
    disconnect: () => {
      void client.deactivate();
    },
  };
}
