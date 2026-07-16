import type { Locale } from "@/lib/i18n";

type TranslationPair = readonly [zh: string, ko: string];

// Safety-net translations for legacy client-only manager screens. Public pages use
// the typed dictionaries in i18n.ts directly; this table prevents old operational
// components from falling back to English while they are incrementally migrated.
const translations: Record<string, TranslationPair> = {
  Account: ["账户", "계정"], Actions: ["操作", "작업"], Active: ["启用", "활성"], "Active location": ["启用门店", "활성 매장"],
  "Active user": ["启用用户", "활성 사용자"], Address: ["地址", "주소"], Available: ["可用", "사용 가능"],
  "Add 5 minutes": ["增加 5 分钟", "5분 추가"], "Subtract 5 minutes": ["减少 5 分钟", "5분 빼기"],
  "Add category": ["添加分类", "카테고리 추가"], "Add coupon": ["添加优惠券", "쿠폰 추가"], "Add image": ["添加图片", "이미지 추가"],
  "Add item": ["添加菜品", "품목 추가"], "Add location": ["添加门店", "매장 추가"], "Add recommendation": ["添加推荐", "추천 추가"],
  "Add role": ["添加角色", "역할 추가"], "Add system menu": ["添加系统菜单", "시스템 메뉴 추가"], "Add user": ["添加用户", "사용자 추가"],
  "All statuses": ["所有状态", "모든 상태"], "Browse location": ["选择门店", "매장 선택"], "Business settings": ["业务设置", "비즈니스 설정"],
  Cancel: ["取消", "취소"], "Cancel edit": ["取消编辑", "편집 취소"], Clear: ["清除", "지우기"], Code: ["代码", "코드"],
  Contact: ["联系方式", "연락처"], Coupon: ["优惠券", "쿠폰"], Coupons: ["优惠券", "쿠폰"], "Coupon discount": ["优惠券折扣", "쿠폰 할인"],
  "Coupon scope": ["优惠券范围", "쿠폰 범위"], "Current location": ["当前门店", "현재 매장"], "Custom subtitle": ["自定义副标题", "사용자 지정 부제"],
  "Custom title": ["自定义标题", "사용자 지정 제목"], "Customer email": ["顾客邮箱", "고객 이메일"], "Customer note": ["顾客备注", "고객 메모"],
  Description: ["描述", "설명"], Email: ["邮箱", "이메일"], English: ["英语", "영어"], "Fixed amount": ["固定金额", "고정 금액"],
  Global: ["全局", "전체"], "Global item": ["全局菜品", "전체 품목"], "Global menu": ["全局菜单", "전체 메뉴"],
  "Global recommendation setting": ["全局推荐设置", "전체 추천 설정"], "Global settings": ["全局设置", "전체 설정"],
  "Header location": ["页眉所选门店", "헤더 선택 매장"], "Hidden here": ["在此隐藏", "여기서 숨김"], Inactive: ["未启用", "비활성"],
  Items: ["菜品", "품목"], Location: ["门店", "매장"], "Location item": ["门店菜品", "매장 품목"], Login: ["登录", "로그인"],
  "Log in": ["登录", "로그인"], "Login required": ["需要登录", "로그인 필요"], Max: ["最高", "최대"], Menu: ["菜单", "메뉴"],
  "Menu access": ["菜单权限", "메뉴 접근"], "Menu item": ["菜品", "메뉴 품목"], "Menu tree": ["菜单结构", "메뉴 트리"], Min: ["最低", "최소"],
  Name: ["名称", "이름"], Next: ["下一页", "다음"], Note: ["备注", "메모"], Notifications: ["通知", "알림"], of: ["共", "/"],
  Order: ["顺序", "순서"], "Order filters": ["订单筛选", "주문 필터"], "Order status": ["订单状态", "주문 상태"], Orders: ["订单", "주문"],
  Page: ["页", "페이지"], partial: ["部分", "일부"], Path: ["路径", "경로"], Percent: ["百分比", "퍼센트"], Permission: ["权限", "권한"],
  "Permission catalog": ["权限目录", "권한 카탈로그"], "Permission records": ["权限记录", "권한 기록"], Pickup: ["自取", "픽업"],
  "Pickup time": ["自取时间", "픽업 시간"], Previous: ["上一页", "이전"], Price: ["价格", "가격"], "Primary image": ["主图片", "대표 이미지"],
  "Print order": ["打印订单", "주문 인쇄"], "Public URL": ["公开网址", "공개 URL"], Qty: ["数量", "수량"], "Recent Orders": ["最近订单", "최근 주문"],
  "Recommended items": ["推荐菜品", "추천 품목"], Refresh: ["刷新", "새로고침"], Reload: ["重新加载", "다시 불러오기"], Remove: ["移除", "삭제"],
  "Remove override": ["移除覆盖设置", "재정의 삭제"], "Role assignments": ["角色分配", "역할 배정"], Roles: ["角色", "역할"],
  "Search email, phone, role...": ["搜索邮箱、电话或角色...", "이메일, 전화번호, 역할 검색..."], selected: ["已选择", "선택됨"],
  "Selected:": ["已选择：", "선택됨:"], settings: ["项设置", "개 설정"], Sort: ["排序", "정렬"], "Sort order": ["排序顺序", "정렬 순서"],
  State: ["状态", "상태"], Status: ["状态", "상태"], Store: ["门店", "매장"], "Store locations": ["门店列表", "매장 목록"],
  "Store/location": ["门店/地点", "매장/위치"], Total: ["合计", "합계"], total: ["总计", "총"], Unavailable: ["不可用", "사용 불가"],
  User: ["用户", "사용자"], Users: ["用户", "사용자"], "Visible here": ["在此显示", "여기서 표시"], "Weekly hours": ["每周营业时间", "주간 영업시간"],
  PENDING: ["待处理", "대기 중"], PAID: ["已付款", "결제 완료"], PREPARING: ["制作中", "준비 중"], READY: ["可自取", "픽업 준비 완료"],
  COMPLETED: ["已完成", "완료"], CANCELLED: ["已取消", "취소됨"], UNKNOWN: ["未知", "알 수 없음"],
  "Checking manager access...": ["正在检查管理权限...", "관리자 접근 권한 확인 중..."],
  "Please log in with a manager or staff account to open this page.": ["请使用经理或员工账户登录以打开此页面。", "이 페이지를 열려면 매니저 또는 직원 계정으로 로그인하세요."],
  "No manager menus available.": ["没有可用的管理菜单。", "사용 가능한 관리자 메뉴가 없습니다."],
  "No visible system menu rows were returned by the backend.": ["后端未返回可见的系统菜单记录。", "백엔드에서 표시 가능한 시스템 메뉴를 반환하지 않았습니다."],
  "Live order notifications": ["实时订单通知", "실시간 주문 알림"], "Optional customer email": ["可选顾客邮箱", "선택 고객 이메일"],
  "No orders found.": ["未找到订单。", "주문을 찾을 수 없습니다."],
  "No orders found. Adjust filters or wait for live paid orders.": ["未找到订单。请调整筛选条件或等待新的已付款订单。", "주문이 없습니다. 필터를 조정하거나 새 결제 주문을 기다리세요."],
  "No item snapshots returned.": ["未返回菜品快照。", "품목 스냅샷이 반환되지 않았습니다."], "Optional status note": ["可选状态备注", "선택 상태 메모"],
  "Adjust the pickup time if needed, then accept to confirm it for the customer.": ["如有需要请调整自取时间，然后接受订单并向顾客确认。", "필요하면 픽업 시간을 조정한 뒤 주문을 수락하여 고객에게 확정하세요."],
  "Available active codes from the backend catalog.": ["后端目录中可用的有效代码。", "백엔드 카탈로그의 사용 가능한 활성 코드입니다."],
  "Change the active store from the manager header.": ["请从管理页眉更改当前门店。", "관리자 헤더에서 활성 매장을 변경하세요."],
  "No active permission codes loaded.": ["未加载有效的权限代码。", "활성 권한 코드를 불러오지 못했습니다."],
  "No direct permissions for this user yet.": ["此用户还没有直接权限。", "이 사용자에게 직접 권한이 아직 없습니다."],
  "No user selected.": ["未选择用户。", "선택한 사용자가 없습니다."], "Select a permission code": ["选择权限代码", "권한 코드 선택"],
  "Permission is granted": ["授予权限", "권한 부여"], "Global permission": ["全局权限", "전체 권한"],
  "Loading permissions...": ["正在加载权限...", "권한 불러오는 중..."], "Loading business settings...": ["正在加载业务设置...", "비즈니스 설정 불러오는 중..."],
  "No business settings returned.": ["未返回业务设置。", "비즈니스 설정이 반환되지 않았습니다."], "System defaults": ["系统默认值", "시스템 기본값"],
  "Effective value from backend:": ["后端生效值：", "백엔드 적용 값:"], "System:": ["系统：", "시스템:"], "Unit:": ["单位：", "단위:"],
  "Loading coupons...": ["正在加载优惠券...", "쿠폰 불러오는 중..."], "No coupons found for this scope.": ["此范围内没有优惠券。", "이 범위에 쿠폰이 없습니다."],
  "Backend validates and applies coupon rules. The frontend does not calculate coupon discounts.": ["优惠券规则由后端验证和应用，前端不计算优惠券折扣。", "쿠폰 규칙은 백엔드에서 검증하고 적용하며 프런트엔드는 할인을 계산하지 않습니다."],
  "Loading recommendations...": ["正在加载推荐...", "추천 불러오는 중..."], "No recommendations for this scope yet.": ["此范围内还没有推荐。", "이 범위에 추천이 아직 없습니다."],
  "Recommendations display on the homepage exactly as returned by the backend.": ["推荐内容将按后端返回结果显示在首页。", "추천은 백엔드에서 반환된 그대로 홈페이지에 표시됩니다."],
  "Select item": ["选择菜品", "품목 선택"], "Select a menu item": ["选择菜品", "메뉴 품목 선택"],
  "Loading restaurant menu...": ["正在加载餐厅菜单...", "레스토랑 메뉴 불러오는 중..."], "Sign in required": ["需要登录", "로그인 필요"],
  "Log in with a manager or admin account to manage restaurant menus.": ["请使用经理或管理员账户登录以管理餐厅菜单。", "레스토랑 메뉴를 관리하려면 매니저 또는 관리자 계정으로 로그인하세요."],
  "Select a location to start managing its menu tree.": ["请选择门店以开始管理其菜单结构。", "메뉴 트리 관리를 시작하려면 매장을 선택하세요."],
  "No store selected. Global records are editable here.": ["未选择门店，可在此编辑全局记录。", "매장을 선택하지 않았습니다. 여기서 전체 레코드를 편집할 수 있습니다."],
  "No store selected yet.": ["尚未选择门店。", "아직 매장을 선택하지 않았습니다."], "Select a category": ["选择分类", "카테고리 선택"],
  "Leave blank to inherit": ["留空以继承", "상속하려면 비워 두세요"], "Show this record for the selected store": ["在所选门店显示此记录", "선택한 매장에 이 레코드 표시"],
  "Categories are the root, items sit underneath, and each item can hold multiple images.": ["分类位于根层级，菜品位于其下，每个菜品可包含多张图片。", "카테고리가 최상위이고 그 아래 품목이 있으며 각 품목에는 여러 이미지를 둘 수 있습니다."],
  "No items yet under this category.": ["此分类下还没有菜品。", "이 카테고리에 품목이 아직 없습니다."],
  "No images yet. Add the first menu photo for this item.": ["还没有图片，请为此菜品添加第一张照片。", "이미지가 없습니다. 이 품목의 첫 메뉴 사진을 추가하세요."],
  "Loading roles...": ["正在加载角色...", "역할 불러오는 중..."], "No roles yet.": ["还没有角色。", "역할이 아직 없습니다."],
  "No role selected.": ["未选择角色。", "선택한 역할이 없습니다."], "No system menus available.": ["没有可用的系统菜单。", "사용 가능한 시스템 메뉴가 없습니다."],
  "Use names like ROLE_ADMIN, ROLE_MANAGER, or ROLE_STAFF.": ["请使用 ROLE_ADMIN、ROLE_MANAGER 或 ROLE_STAFF 等名称。", "ROLE_ADMIN, ROLE_MANAGER, ROLE_STAFF와 같은 이름을 사용하세요."],
  "Loading users...": ["正在加载用户...", "사용자 불러오는 중..."], "No users found.": ["未找到用户。", "사용자를 찾을 수 없습니다."],
  "No roles": ["没有角色", "역할 없음"], "No roles available.": ["没有可用角色。", "사용 가능한 역할이 없습니다."],
  "Save the user before assigning roles.": ["分配角色前请先保存用户。", "역할을 배정하기 전에 사용자를 저장하세요."],
  "Loading locations...": ["正在加载门店...", "매장 불러오는 중..."], "No locations yet. Add the first store with the form.": ["还没有门店，请使用表单添加第一家。", "매장이 없습니다. 양식으로 첫 매장을 추가하세요."],
  "Required fields match the backend locations table.": ["必填字段与后端门店表一致。", "필수 필드는 백엔드 매장 테이블과 일치합니다."],
  "Save or refresh after backend generates a code.": ["后端生成代码后请保存或刷新。", "백엔드에서 코드를 생성한 뒤 저장하거나 새로고침하세요."],
  "Loading store hours...": ["正在加载营业时间...", "영업시간 불러오는 중..."], "No hours configured yet.": ["尚未配置营业时间。", "영업시간이 아직 설정되지 않았습니다."],
  "Closed all day": ["全天休息", "종일 휴무"], "Closed days do not need open or close times.": ["休息日无需设置开门或关门时间。", "휴무일에는 영업 시작 및 종료 시간이 필요하지 않습니다."],
  "Loading system menus...": ["正在加载系统菜单...", "시스템 메뉴 불러오는 중..."], "No system menus yet. Add the first menu record.": ["还没有系统菜单，请添加第一条菜单记录。", "시스템 메뉴가 없습니다. 첫 메뉴 레코드를 추가하세요."],
  "System menu records": ["系统菜单记录", "시스템 메뉴 레코드"], "These rows control admin navigation and role menu assignment.": ["这些记录控制管理导航和角色菜单分配。", "이 레코드는 관리자 내비게이션과 역할 메뉴 배정을 제어합니다."],
  "Top level": ["顶层", "최상위"], "Visible in the menu": ["在菜单中显示", "메뉴에 표시"], "Visible to staff and customers": ["对员工和顾客可见", "직원과 고객에게 표시"],
  "Available for ordering": ["可供点餐", "주문 가능"],
  "Coupon code and name are required.": ["优惠券代码和名称为必填项。", "쿠폰 코드와 이름은 필수입니다."],
  "Discount value must be greater than 0.": ["折扣值必须大于 0。", "할인 값은 0보다 커야 합니다."],
  "Enter an email address to search.": ["请输入邮箱地址进行搜索。", "검색할 이메일 주소를 입력하세요."],
  "Permission code is required.": ["权限代码为必填项。", "권한 코드는 필수입니다."], "Search and select a user first.": ["请先搜索并选择用户。", "먼저 사용자를 검색하고 선택하세요."],
  "Toronto, Ontario": ["加拿大安大略省多伦多", "캐나다 온타리오주 토론토"], "Umika Sushi home": ["Umika Sushi 首页", "Umika Sushi 홈"],
  "Authentication required.": ["需要身份验证。", "인증이 필요합니다."], "Unable to reach the Umika API.": ["无法连接 Umika API。", "Umika API에 연결할 수 없습니다."],
  "Unable to load locations.": ["无法加载门店。", "매장을 불러올 수 없습니다."], "Unable to load permission catalog.": ["无法加载权限目录。", "권한 카탈로그를 불러올 수 없습니다."],
  "Unable to load roles and menu permissions.": ["无法加载角色和菜单权限。", "역할과 메뉴 권한을 불러올 수 없습니다."],
  "Unable to load system menus.": ["无法加载系统菜单。", "시스템 메뉴를 불러올 수 없습니다."], "Unable to load user permissions.": ["无法加载用户权限。", "사용자 권한을 불러올 수 없습니다."],
  "Unable to save location.": ["无法保存门店。", "매장을 저장할 수 없습니다."], "Unable to delete location.": ["无法删除门店。", "매장을 삭제할 수 없습니다."],
  "Unable to update location status.": ["无法更新门店状态。", "매장 상태를 업데이트할 수 없습니다."], "Unable to save role.": ["无法保存角色。", "역할을 저장할 수 없습니다."],
  "Unable to delete role.": ["无法删除角色。", "역할을 삭제할 수 없습니다."], "Unable to save all menu assignments.": ["无法保存全部菜单分配。", "모든 메뉴 배정을 저장할 수 없습니다."],
  "Unable to save system menu.": ["无法保存系统菜单。", "시스템 메뉴를 저장할 수 없습니다."], "Unable to delete system menu.": ["无法删除系统菜单。", "시스템 메뉴를 삭제할 수 없습니다."],
  "Unable to update menu state.": ["无法更新菜单状态。", "메뉴 상태를 업데이트할 수 없습니다."], "Unable to save user permission.": ["无法保存用户权限。", "사용자 권한을 저장할 수 없습니다."],
  "Unable to delete user permission.": ["无法删除用户权限。", "사용자 권한을 삭제할 수 없습니다."], "Unable to search users by email.": ["无法按邮箱搜索用户。", "이메일로 사용자를 검색할 수 없습니다."],
  "Unable to resolve the selected header location. Please choose the location again.": ["无法识别页眉中选择的门店，请重新选择。", "헤더에서 선택한 매장을 확인할 수 없습니다. 매장을 다시 선택하세요."],
  "Location created.": ["门店已创建。", "매장이 생성되었습니다."], "Location updated.": ["门店已更新。", "매장이 업데이트되었습니다."],
  "Location deleted.": ["门店已删除。", "매장이 삭제되었습니다."], "Location status updated.": ["门店状态已更新。", "매장 상태가 업데이트되었습니다."],
  "Location URL copied.": ["门店网址已复制。", "매장 URL이 복사되었습니다."], "Role created.": ["角色已创建。", "역할이 생성되었습니다."],
  "Role updated.": ["角色已更新。", "역할이 업데이트되었습니다."], "Role deleted.": ["角色已删除。", "역할이 삭제되었습니다."],
  "Role menu permissions updated.": ["角色菜单权限已更新。", "역할 메뉴 권한이 업데이트되었습니다."], "Role granted.": ["角色已授予。", "역할이 부여되었습니다."],
  "Role removed.": ["角色已移除。", "역할이 삭제되었습니다."], "User created.": ["用户已创建。", "사용자가 생성되었습니다."],
  "User updated.": ["用户已更新。", "사용자가 업데이트되었습니다."], "User deleted.": ["用户已删除。", "사용자가 삭제되었습니다."],
  "User permission created.": ["用户权限已创建。", "사용자 권한이 생성되었습니다."], "User permission updated.": ["用户权限已更新。", "사용자 권한이 업데이트되었습니다."],
  "User permission deleted.": ["用户权限已删除。", "사용자 권한이 삭제되었습니다."], "System menu created.": ["系统菜单已创建。", "시스템 메뉴가 생성되었습니다."],
  "System menu updated.": ["系统菜单已更新。", "시스템 메뉴가 업데이트되었습니다."], "System menu deleted.": ["系统菜单已删除。", "시스템 메뉴가 삭제되었습니다."],
  "Coupon created.": ["优惠券已创建。", "쿠폰이 생성되었습니다."], "Coupon updated.": ["优惠券已更新。", "쿠폰이 업데이트되었습니다."],
  "Coupon activated.": ["优惠券已启用。", "쿠폰이 활성화되었습니다."], "Coupon deactivated.": ["优惠券已停用。", "쿠폰이 비활성화되었습니다."],
  "Recommendation created.": ["推荐已创建。", "추천이 생성되었습니다."], "Recommendation updated.": ["推荐已更新。", "추천이 업데이트되었습니다."],
  "Recommendation deleted.": ["推荐已删除。", "추천이 삭제되었습니다."], "Recommendation is visible for this location.": ["推荐已在此门店显示。", "이 매장에 추천이 표시됩니다."],
  "Recommendation is hidden for this location.": ["推荐已在此门店隐藏。", "이 매장에서 추천이 숨겨집니다."],
};

const dynamicTranslations: Array<readonly [RegExp, (match: RegExpMatchArray, locale: Exclude<Locale, "en">) => string]> = [
  [/^Page (\d+) of (\d+)$/, (m, locale) => locale === "zh" ? `第 ${m[1]} 页，共 ${m[2]} 页` : `${m[1]} / ${m[2]}페이지`],
  [/^(\d+) users shown\.$/, (m, locale) => locale === "zh" ? `显示 ${m[1]} 位用户。` : `사용자 ${m[1]}명 표시.`],
  [/^(\d+) locations loaded from backend\.$/, (m, locale) => locale === "zh" ? `已从后端加载 ${m[1]} 家门店。` : `백엔드에서 매장 ${m[1]}개를 불러왔습니다.`],
  [/^(\d+) menu records loaded from backend\.$/, (m, locale) => locale === "zh" ? `已从后端加载 ${m[1]} 条菜单记录。` : `백엔드에서 메뉴 레코드 ${m[1]}개를 불러왔습니다.`],
  [/^Order (.+) accepted\.$/, (m, locale) => locale === "zh" ? `订单 ${m[1]} 已接受。` : `주문 ${m[1]}이(가) 수락되었습니다.`],
  [/^Order (.+) status updated to (.+)\.$/, (m, locale) => locale === "zh" ? `订单 ${m[1]} 状态已更新为 ${translateUiText(m[2], locale)}。` : `주문 ${m[1]} 상태가 ${translateUiText(m[2], locale)}(으)로 변경되었습니다.`],
];

export function translateUiText(value: string, locale: Locale) {
  if (locale === "en") {
    return value;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  const exact = translations[normalized];

  if (exact) {
    return exact[locale === "zh" ? 0 : 1];
  }

  for (const [pattern, translate] of dynamicTranslations) {
    const match = normalized.match(pattern);
    if (match) {
      return translate(match, locale);
    }
  }

  return value;
}
