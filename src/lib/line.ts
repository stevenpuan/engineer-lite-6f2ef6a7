// LINE 官方帳號設定（平台共用一個官方帳號，靠綁定分辨店鋪）
// 開通官方帳號後，把 Basic ID（例如 @123abcde）填在這裡。
export const LINE_OA_BASIC_ID = '@995nanib'

export const LINE_ADD_FRIEND_URL = LINE_OA_BASIC_ID
  ? `https://line.me/R/ti/p/${encodeURIComponent(LINE_OA_BASIC_ID)}`
  : ''

/** Rich menu 六格對應的關鍵字（LINE 官方帳號後台設定圖文選單時用「文字」動作） */
export const LINE_MENU_KEYWORDS = ['回報進度', '拍照記帳', '我的案子', '收款狀況', '付款提醒', '問一下'] as const

// ── 代發綁定邀請（老闆／平台管理員替成員產生 8 碼、72 小時有效的綁定碼）──

const OA_PATH = encodeURIComponent(LINE_OA_BASIC_ID)

/** 點開後 LINE 會打開官方帳號聊天室，訊息欄已填好「綁定 XXXXXXXX」，按送出即完成 */
export function lineSendCodeUrl(code: string) {
  return `https://line.me/R/oaMessage/${OA_PATH}/?${encodeURIComponent(`綁定 ${code}`)}`
}

/** 用 LINE 把文字分享給聯絡人（老闆把邀請傳給員工） */
export function lineShareUrl(message: string) {
  return `https://line.me/R/share?text=${encodeURIComponent(message)}`
}

export function formatExpiry(iso: string) {
  return new Date(iso).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

export function lineInviteMessage(opts: { code: string; expiresAt: string; name?: string | null; tenantName?: string | null }) {
  const who = opts.name ? `${opts.name} 您好，` : ''
  const shop = opts.tenantName ? `「${opts.tenantName}」` : ''
  return [
    `${who}邀請你使用${shop}工程系統的 LINE 助手（回報進度、拍照記帳）。`,
    '',
    `1. 加官方帳號好友：${LINE_ADD_FRIEND_URL}`,
    `2. 點這裡送出綁定碼：${lineSendCodeUrl(opts.code)}`,
    '',
    `或直接傳「綁定 ${opts.code}」給官方帳號 ${LINE_OA_BASIC_ID}。`,
    `綁定碼 ${formatExpiry(opts.expiresAt)} 前有效，只能用一次。`,
  ].join('\n')
}
