import type { Locale } from "@/lib/i18n";
const en = {
  title: "Order printers", description: "Configure receipt printers and connection recovery for each location.",
  location: "Location", choose: "Choose a location", add: "Add printer", name: "Printer name", ip: "Local IP address",
  enabled: "Receive orders", save: "Save settings", saved: "Printer settings saved.", interval: "Fetch orders every (seconds)",
  stale: "Hold orders older than (minutes)", alarm: "Sound an alarm when the server is unreachable",
  alarmHelp: "The restaurant agent sounds an alarm after 15 seconds without a successful connection. Keep the agent running and the computer awake with audio enabled.",
  routing: "Each enabled printer receives one complete receipt for new paid orders at this location. Supports up to 16 printers. Existing orders are not backfilled.",
  empty: "No printers configured.", paired: "Agent connected", offline: "Agent offline or not paired", lastSeen: "Last contact",
  pair: "Generate agent key", rotate: "Replace agent key", pairHelp: "Shown once. Copy this key into the restaurant agent setup. Replacing it disconnects the previous agent and holds any uncertain deliveries for review.",
  pairConfirm: "Replace the agent key? The previous agent will lose access. Check any outstanding receipts before reprinting.",
  copied: "Copied", copy: "Copy key", console: "Open local alarm console", consoleHelp: "Open this on the restaurant computer running the agent. The console remains available during internet outages.",
  jobs: "Recent print jobs", order: "Order", state: "Delivery", created: "Created", reprint: "Reprint", refresh: "Refresh",
  reprintConfirm: "Reprint all saved tickets for this order, including the whole-order copy, marked REPRINT?", reprintQueued: "Reprint queued.",
  sentHelp: "Sent means receipt bytes were delivered; it does not confirm paper came out. Check uncertain deliveries before reprinting.",
  noJobs: "No print jobs yet.", error: "Unable to complete the request.", denied: "You need location settings permission for this location.",
  auth: "Please sign in again.", unreachable: "The server cannot be reached. The local agent will reconnect automatically.",
  invalid: "Use a private IPv4 address, unique per location, and valid whole-number intervals.",
  reprintBlocked: "Check the order. Unpaid, cancelled, fully refunded, or already queued orders cannot be reprinted here.",
  loading: "Loading…", busy: "Saving…", ready: "Settings loaded", never: "Never", unsaved: "Save or discard your changes before switching locations.",
  QUEUED: "Queued", CLAIMED: "At restaurant", SENT: "Sent", UNCERTAIN: "Check printer", HELD: "Needs review", CANCELLED: "Cancelled",
};
type Copy = { [K in keyof typeof en]: string };
const zh: Copy = {
  title:"订单打印机",description:"为各门店配置小票打印机与断线恢复。",location:"门店",choose:"选择门店",add:"添加打印机",name:"打印机名称",ip:"局域网 IP 地址",enabled:"接收订单",save:"保存设置",saved:"打印机设置已保存。",interval:"订单获取间隔（秒）",stale:"暂停超过此时长的订单（分钟）",alarm:"服务器无法连接时发出警报",alarmHelp:"餐厅代理连续 15 秒无法成功连接时将发出警报。请保持代理运行、电脑唤醒并开启声音。",routing:"每台启用的打印机将收到本门店新付款订单的完整小票。最多支持 16 台，不补打历史订单。",empty:"尚未配置打印机。",paired:"代理已连接",offline:"代理离线或未配对",lastSeen:"上次连接",pair:"生成代理密钥",rotate:"更换代理密钥",pairHelp:"密钥仅显示一次。请复制到餐厅代理配置。更换密钥会断开旧代理，并将不确定的投递保留待检查。",pairConfirm:"更换代理密钥？旧代理将失去访问权限。重打前请检查尚未确认的小票。",copied:"已复制",copy:"复制密钥",console:"打开本地警报控制台",consoleHelp:"请在运行代理的餐厅电脑上打开。互联网断开时，本地控制台仍可使用。",jobs:"最近打印任务",order:"订单",state:"投递状态",created:"创建时间",reprint:"重打",refresh:"刷新",reprintConfirm:"重打此订单的所有已保存小票（包括整单小票），并标注 REPRINT？",reprintQueued:"已加入重打队列。",sentHelp:"已发送表示小票数据已传输，不代表纸张已打印。不确定的投递请先检查再重打。",noJobs:"暂无打印任务。",error:"无法完成请求。",denied:"您需要此门店的设置管理权限。",auth:"请重新登录。",unreachable:"无法连接服务器。餐厅代理将自动重连。",invalid:"请输入门店内唯一的私有 IPv4 地址以及有效的整数间隔。",reprintBlocked:"请检查订单。未付款、已取消、全额退款或已排队的订单无法在此重打。",loading:"加载中…",busy:"保存中…",ready:"设置已加载",never:"从未连接",unsaved:"切换门店前请保存或放弃更改。",QUEUED:"排队中",CLAIMED:"已到餐厅",SENT:"已发送",UNCERTAIN:"检查打印机",HELD:"待检查",CANCELLED:"已取消",
};
const ko: Copy = {
  title:"주문 프린터",description:"매장별 영수증 프린터와 연결 복구를 설정합니다.",location:"매장",choose:"매장 선택",add:"프린터 추가",name:"프린터 이름",ip:"로컬 IP 주소",enabled:"주문 수신",save:"설정 저장",saved:"프린터 설정을 저장했습니다.",interval:"주문 조회 간격(초)",stale:"오래된 주문 보류 기준(분)",alarm:"서버에 연결할 수 없을 때 알람 울림",alarmHelp:"매장 에이전트가 15초 동안 연결하지 못하면 알람이 울립니다. 에이전트를 실행하고 컴퓨터의 절전 모드를 해제하고 소리를 켜 두세요.",routing:"활성화된 각 프린터에 이 매장의 새 결제 주문 영수증을 한 장씩 보냅니다. 최대 16대를 지원하며 기존 주문은 소급 인쇄하지 않습니다.",empty:"설정된 프린터가 없습니다.",paired:"에이전트 연결됨",offline:"에이전트 오프라인 또는 미연결",lastSeen:"마지막 연결",pair:"에이전트 키 생성",rotate:"에이전트 키 교체",pairHelp:"한 번만 표시됩니다. 매장 에이전트 설정에 복사하세요. 키를 교체하면 이전 에이전트의 연결이 끊기고 불확실한 전송은 검토 대상으로 유지됩니다.",pairConfirm:"키를 교체하시겠습니까? 이전 에이전트의 접근이 차단됩니다. 재인쇄 전 미확인 영수증을 확인하세요.",copied:"복사됨",copy:"키 복사",console:"로컬 알람 콘솔 열기",consoleHelp:"에이전트가 실행 중인 매장 컴퓨터에서 여세요. 인터넷 연결이 끊겨도 콘솔을 사용할 수 있습니다.",jobs:"최근 인쇄 작업",order:"주문",state:"전송",created:"생성 시각",reprint:"재인쇄",refresh:"새로고침",reprintConfirm:"전체 주문 사본을 포함하여 저장된 모든 주문 영수증을 REPRINT 표시와 함께 재인쇄하시겠습니까?",reprintQueued:"재인쇄 대기열에 추가했습니다.",sentHelp:"전송 완료는 데이터가 전달되었음을 의미하며 실제 인쇄를 확인하지는 않습니다. 불확실한 전송은 확인 후 재인쇄하세요.",noJobs:"인쇄 작업이 없습니다.",error:"요청을 완료하지 못했습니다.",denied:"이 매장의 설정 관리 권한이 필요합니다.",auth:"다시 로그인하세요.",unreachable:"서버에 연결할 수 없습니다. 에이전트가 자동으로 재연결합니다.",invalid:"매장 내 고유한 사설 IPv4 주소와 유효한 정수 간격을 입력하세요.",reprintBlocked:"주문을 확인하세요. 미결제, 취소, 전액 환불 또는 대기 중인 주문은 여기서 재인쇄할 수 없습니다.",loading:"불러오는 중…",busy:"저장 중…",ready:"설정을 불러왔습니다",never:"연결 기록 없음",unsaved:"매장을 변경하기 전에 변경 사항을 저장하거나 취소하세요.",QUEUED:"대기 중",CLAIMED:"매장 수신",SENT:"전송됨",UNCERTAIN:"프린터 확인",HELD:"검토 필요",CANCELLED:"취소됨",
};
export const printerTranslations: Record<Locale, Copy> = { en, zh, ko };
export const printerAgentTranslations = {
  en: { description: "Assign menu items to printers and monitor delivery.", setupTitle: "Connect the restaurant agent", setupHelp: "Create printer names and routing below. On the local agent page, select those names and enter their IP addresses. Generate a store key here and paste it into the agent." },
  zh: { description: "分配菜品打印机并监控打印投递。", setupTitle: "连接餐厅代理", setupHelp: "在下方创建打印机名称和菜品分配。在本地代理页面选择对应名称并填写 IP 地址。在此生成门店密钥并粘贴到代理中。" },
  ko: { description: "메뉴별 프린터를 배정하고 전송을 확인합니다.", setupTitle: "매장 에이전트 연결", setupHelp: "아래에서 프린터 이름과 메뉴 배정을 설정하세요. 로컬 에이전트에서 해당 이름을 선택하고 IP 주소를 입력하세요. 매장 키를 생성하여 에이전트에 붙여 넣으세요." },
};
