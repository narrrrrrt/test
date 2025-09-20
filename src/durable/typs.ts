// Types.ts

// --- プレイヤーの席 ---
export type Seat = "black" | "white" | "observer";

// --- ゲーム進行の状態 ---
export type Status = "waiting" | "playing" | "ended";

// --- クライアントからのWSメッセージ ---
export type WSMessage = {
  event: string; // join / leave / move / reset など
  data?: Record<string, any>;
};

// --- サーバーから単発レスポンス（リクエスト投げた人だけに返す）---
export interface ResponseMessage {
  event: string;
  token?: string;   // 新規発行されたトークン
  role?: Seat;      // black / white / observer
  status?: Status;
  stats?: any;      // 統計（必要なら）
  error?: string;
}

// --- サーバーからブロードキャスト（全クライアントへ配信）---
export interface BroadcastMessage {
  event: string;    // join / leave / move / reset など
  black: boolean;   // black が埋まってるか
  white: boolean;   // white が埋まってるか
  status: Status;   // 現在の状態
  board: string[];  // 8行8文字の配列
}

// --- Join ロジックの返却型 ---
export type JoinResult = {
  role: "black" | "white" | "observer";
  token?: string;
};