// LINE 官方帳號設定（平台共用一個官方帳號，靠綁定分辨店鋪）
// 開通官方帳號後，把 Basic ID（例如 @123abcde）填在這裡。
export const LINE_OA_BASIC_ID = '@995nanib'

export const LINE_ADD_FRIEND_URL = LINE_OA_BASIC_ID
  ? `https://line.me/R/ti/p/${encodeURIComponent(LINE_OA_BASIC_ID)}`
  : ''

/** Rich menu 六格對應的關鍵字（LINE 官方帳號後台設定圖文選單時用「文字」動作） */
export const LINE_MENU_KEYWORDS = ['回報進度', '拍照記帳', '我的案子', '收款狀況', '付款提醒', '問一下'] as const
