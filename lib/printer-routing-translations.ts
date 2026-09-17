import type { Locale } from "@/lib/i18n";
const en = {
  title: "Printer routing", help: "Create printer names here, then select them on the restaurant agent and enter their IP addresses.",
  name: "Printer name", enabled: "Enabled", add: "Add printer", whole: "Default printer",
  defaultBadge: "Default printer", chooseDefault: "Choose an enabled printer", defaultRequired: "Choose a default printer before saving.",
  automaticHelp: "This printer receives every complete order. Items assigned to it also get a separate station ticket. Missing or unreachable station printers send their item tickets here.",
  categories: "Category assignments", categoryHelp: "Items in a category use its printer, including items added later.",
  items: "Individual item exceptions", itemHelp: "Search by name, add an item, then choose its printer. An item choice overrides its category.",
  search: "Search menu items by name", searchResults: "Matching menu items", chooseItem: "Choose an item", addItem: "Add item", removeItem: "Remove", destination: "Print at",
  fallback: "Default printer", save: "Save routing", saved: "Printer routing saved. New orders use these settings.",
  loading: "Loading…", error: "Could not load or save printer routing.", invalid: "Use unique printer names and choose an enabled whole-order printer.",
  denied: "You do not have permission for this store.", noItems: "No matching menu items.", previous: "Previous", next: "Next",
  print: "Reprint all order tickets", queued: "All order tickets queued with REPRINT at the top.",
  blocked: "Cannot reprint. Check that this order has print tickets and no tickets are still waiting or sending.",
  auth: "Please sign in again.", requestFailed: "Printer server unavailable. Please try again.",
};
type Copy = typeof en;
const zh: Copy = {
  title:"打印分配",help:"在此创建打印机名称，然后在餐厅代理中选择对应名称并填写 IP 地址。",
  name:"打印机名称",enabled:"启用",add:"添加打印机",whole:"默认打印机",
  defaultBadge:"默认打印机",chooseDefault:"选择已启用的打印机",defaultRequired:"保存前请选择默认打印机。",
  automaticHelp:"此打印机接收每笔完整订单。分配给它的菜品还会单独打印一张分站小票。未配置或无法连接的分站小票也会送到这里。",
  categories:"分类打印分配",categoryHelp:"分类中的菜品会使用所选打印机，以后新增的菜品也一样。",
  items:"单个菜品例外",itemHelp:"按名称搜索并添加菜品，再选择打印机。单个菜品的设置优先于分类。",
  search:"按名称搜索菜品",searchResults:"匹配的菜品",chooseItem:"选择菜品",addItem:"添加菜品",removeItem:"移除",destination:"打印到",
  fallback:"默认打印机",save:"保存打印分配",saved:"打印分配已保存，新订单将使用这些设置。",
  loading:"加载中…",error:"无法加载或保存打印分配。",invalid:"请使用不同的打印机名称，并选择已启用的整单打印机。",
  denied:"您没有此门店的操作权限。",noItems:"没有匹配的菜品。",previous:"上一页",next:"下一页",
  print:"重打此订单的全部小票",queued:"全部小票已加入队列，顶部将标注 REPRINT。",
  blocked:"无法重打。请确认订单已有打印小票，且没有等待或发送中的任务。",
  auth:"请重新登录。",requestFailed:"打印服务器不可用，请重试。",
};
const ko: Copy = {
  title:"프린터 배정",help:"여기서 프린터 이름을 만든 후 매장 에이전트에서 이름을 선택하고 IP 주소를 입력하세요.",
  name:"프린터 이름",enabled:"활성화",add:"프린터 추가",whole:"기본 프린터",
  defaultBadge:"기본 프린터",chooseDefault:"활성화된 프린터 선택",defaultRequired:"저장하기 전에 기본 프린터를 선택하세요.",
  automaticHelp:"이 프린터는 모든 전체 주문을 인쇄합니다. 여기에 배정한 메뉴는 별도의 작업대 영수증도 인쇄합니다. 설정되지 않았거나 연결되지 않는 작업대 영수증도 여기로 보냅니다.",
  categories:"카테고리별 프린터",categoryHelp:"카테고리의 항목과 나중에 추가한 항목에도 선택한 프린터가 적용됩니다.",
  items:"개별 메뉴 예외",itemHelp:"이름으로 검색해 항목을 추가하고 프린터를 선택하세요. 개별 항목 설정이 카테고리보다 우선합니다.",
  search:"메뉴 이름 검색",searchResults:"검색된 메뉴",chooseItem:"메뉴 선택",addItem:"항목 추가",removeItem:"제거",destination:"출력 프린터",
  fallback:"기본 프린터",save:"배정 저장",saved:"프린터 배정을 저장했습니다. 새 주문에 적용됩니다.",
  loading:"불러오는 중…",error:"프린터 배정을 불러오거나 저장하지 못했습니다.",invalid:"고유한 이름을 입력하고 활성화된 전체 주문 프린터를 선택하세요.",
  denied:"이 매장에 대한 권한이 없습니다.",noItems:"일치하는 메뉴가 없습니다.",previous:"이전",next:"다음",
  print:"주문의 모든 영수증 재인쇄",queued:"모든 영수증을 대기열에 추가했습니다. 상단에 REPRINT가 표시됩니다.",
  blocked:"재인쇄할 수 없습니다. 인쇄 기록이 있고 대기 또는 전송 중인 작업이 없는지 확인하세요.",
  auth:"다시 로그인하세요.",requestFailed:"프린터 서버를 사용할 수 없습니다. 다시 시도하세요.",
};
export const routingTranslations: Record<Locale, Copy> = { en, zh, ko };
