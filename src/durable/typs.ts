// ルームの状態
export type RoomStatus = "waiting" | "black" | "white" | "leave";

// プレイヤーの席
export type Seat = "black" | "white" | "observer";

// セッション情報
export type Session = {
  seat: Seat;
  send?: (msg: string) => void;
};

// Initイベントのデータ型
export type InitData = {
  black: boolean;
  white: boolean;
  status: RoomStatus;
};

// SSEイベント共通型
export type SSEEvent<T> = {
  event: string;
  data: T;
};

// Joinのレスポンス
export type JoinResponse = {
  token: string;
};

// 共通レスポンス（汎用的に使える）
export type CommonResponse = {
  action: string;
  [key: string]: any;
};