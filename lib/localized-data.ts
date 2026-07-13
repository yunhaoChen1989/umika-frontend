import { menuItems, rewardTransactions } from "@/lib/mock-data";
import type { Locale } from "@/lib/i18n";
import { managerDashboard, managerMenus, managerPermissions, managerRoleAccess, managerUsers } from "@/lib/manager-data";

const menuTranslations = {
  en: {
    "umika-omakase": ["Umika Omakase Box", "Chef selection of nigiri, sashimi, maki, and seasonal garnish.", "Combos", ["Chef pick", "Dinner"]],
    "salmon-nigiri": ["Atlantic Salmon Nigiri", "Two pieces with seasoned rice, wasabi, and house soy.", "Nigiri", ["Fresh", "Classic"]],
    "spicy-tuna": ["Spicy Tuna Roll", "Tuna, cucumber, scallion, sesame, and chili mayo.", "Rolls", ["Spicy"]],
    "dragon-roll": ["Dragon Roll", "Tempura shrimp, avocado, unagi sauce, and tobiko.", "Rolls", ["Signature"]],
    "sashimi-trio": ["Sashimi Trio", "Nine slices of salmon, tuna, and hamachi.", "Sashimi", ["Protein"]],
    "matcha-soda": ["Yuzu Matcha Soda", "Sparkling yuzu, chilled matcha, and citrus peel.", "Drinks", ["House drink"]],
  },
  zh: {
    "umika-omakase": ["Umika 主厨精选盒", "主厨精选握寿司、刺身、卷物与季节配菜。", "套餐", ["主厨推荐", "晚餐"]],
    "salmon-nigiri": ["大西洋三文鱼握寿司", "两贯寿司饭，搭配芥末与店制酱油。", "握寿司", ["新鲜", "经典"]],
    "spicy-tuna": ["辣味金枪鱼卷", "金枪鱼、黄瓜、葱、芝麻与辣味蛋黄酱。", "卷物", ["微辣"]],
    "dragon-roll": ["龙卷", "天妇罗虾、牛油果、鳗鱼酱与飞鱼籽。", "卷物", ["招牌"]],
    "sashimi-trio": ["三色刺身", "九片三文鱼、金枪鱼与油甘鱼。", "刺身", ["高蛋白"]],
    "matcha-soda": ["柚子抹茶气泡饮", "气泡柚子、冰抹茶与柑橘皮。", "饮品", ["店制饮品"]],
  },
  ko: {
    "umika-omakase": ["Umika 오마카세 박스", "셰프가 고른 니기리, 사시미, 마키와 시즌 가니시.", "콤보", ["셰프 추천", "저녁"]],
    "salmon-nigiri": ["대서양 연어 니기리", "양념한 밥, 와사비, 하우스 간장을 곁들인 두 피스.", "니기리", ["신선함", "클래식"]],
    "spicy-tuna": ["스파이시 참치 롤", "참치, 오이, 파, 참깨와 칠리 마요.", "롤", ["매콤"]],
    "dragon-roll": ["드래곤 롤", "새우튀김, 아보카도, 장어 소스와 토비코.", "롤", ["시그니처"]],
    "sashimi-trio": ["사시미 트리오", "연어, 참치, 하마치 아홉 점.", "사시미", ["단백질"]],
    "matcha-soda": ["유자 말차 소다", "스파클링 유자, 차가운 말차와 시트러스 필.", "음료", ["하우스 음료"]],
  },
} as const;

const rewardLabels = {
  en: ["Order U-1029", "Friend first order", "$10 reward redeemed", "Birthday bonus", "Today", "Jun 18", "Jun 10", "May 04"],
  zh: ["订单 U-1029", "朋友首笔订单", "已兑换 $10 奖励", "生日奖励", "今天", "6月18日", "6月10日", "5月04日"],
  ko: ["주문 U-1029", "친구 첫 주문", "$10 리워드 사용", "생일 보너스", "오늘", "6월 18일", "6월 10일", "5월 04일"],
} as const;

export function getLocalizedMenuItems(locale: Locale) {
  return menuItems.map((item) => {
    const [name, description, category, tags] = menuTranslations[locale][item.id as keyof (typeof menuTranslations)["en"]];
    return { ...item, name, description, category, tags };
  });
}

export function getLocalizedRewardTransactions(locale: Locale) {
  const labels = rewardLabels[locale];
  return rewardTransactions.map((transaction, index) => ({
    ...transaction,
    label: labels[index],
    date: labels[index + 4],
  }));
}

const managerMenuNames = {
  en: {},
  zh: {
    MANAGER_DASHBOARD: "仪表盘",
    MANAGER_STORES: "门店",
    MANAGER_STORE_DETAILS: "门店详情",
    MANAGER_STORE_HOURS: "营业时间",
    MANAGER_USERS: "用户",
    MANAGER_CUSTOMERS: "顾客",
    MANAGER_STAFF_MEMBERS: "员工",
    MANAGER_STAFF_INVITES: "员工邀请",
    MANAGER_ROLES_PERMISSIONS: "角色与权限",
    MANAGER_MENUS: "菜单",
    MANAGER_MENU_CATEGORIES: "分类",
    MANAGER_MENU_ITEMS: "菜品",
    MANAGER_MENU_AVAILABILITY: "供应状态",
    MANAGER_RECOMMENDATIONS: "推荐菜单",
    MANAGER_ORDERS: "订单",
    MANAGER_COUPONS: "优惠券",
    MANAGER_REWARDS: "积分",
    MANAGER_PAYMENTS: "付款",
    MANAGER_NOTIFICATIONS: "通知",
    MANAGER_AUDIT_LOGS: "审计日志",
    MANAGER_SETTINGS: "设置",
    MANAGER_SYSTEM_MENUS: "系统菜单",
    MANAGER_LOCATION_SETTINGS: "门店设置",
    MANAGER_ROLE_PERMISSIONS: "角色权限",
    MANAGER_USER_PERMISSIONS: "用户权限",
  },
  ko: {
    MANAGER_DASHBOARD: "대시보드",
    MANAGER_STORES: "매장",
    MANAGER_STORE_DETAILS: "매장 정보",
    MANAGER_STORE_HOURS: "영업시간",
    MANAGER_USERS: "사용자",
    MANAGER_CUSTOMERS: "고객",
    MANAGER_STAFF_MEMBERS: "직원",
    MANAGER_STAFF_INVITES: "직원 초대",
    MANAGER_ROLES_PERMISSIONS: "역할과 권한",
    MANAGER_MENUS: "메뉴",
    MANAGER_MENU_CATEGORIES: "카테고리",
    MANAGER_MENU_ITEMS: "품목",
    MANAGER_MENU_AVAILABILITY: "판매 가능 상태",
    MANAGER_RECOMMENDATIONS: "추천 메뉴",
    MANAGER_ORDERS: "주문",
    MANAGER_COUPONS: "쿠폰",
    MANAGER_REWARDS: "리워드",
    MANAGER_PAYMENTS: "결제",
    MANAGER_NOTIFICATIONS: "알림",
    MANAGER_AUDIT_LOGS: "감사 로그",
    MANAGER_SETTINGS: "설정",
    MANAGER_SYSTEM_MENUS: "시스템 메뉴",
    MANAGER_LOCATION_SETTINGS: "매장 설정",
    MANAGER_ROLE_PERMISSIONS: "역할 권한",
    MANAGER_USER_PERMISSIONS: "사용자 권한",
  },
} as const;

export function getLocalizedManagerMenus(locale: Locale, menus: typeof managerMenus = managerMenus) {
  const names = managerMenuNames[locale] as Record<string, string>;
  return menus.map((menu) => ({
    ...menu,
    name: names[menu.code] ?? menu.name,
    children: menu.children?.map((child) => localizeManagerMenu(child, names)),
  }));
}

function localizeManagerMenu(menu: typeof managerMenus[number], names: Record<string, string>): typeof managerMenus[number] {
  return {
    ...menu,
    name: names[menu.code] ?? menu.name,
    children: menu.children?.map((child) => localizeManagerMenu(child, names)),
  };
}

const dashboardTranslations = {
  en: managerDashboard,
  zh: {
    stats: [
      { label: "未完成订单", value: "18", detail: "6 单制作中，4 单待自取" },
      { label: "在线员工", value: "7", detail: "1 名经理与 6 名员工在线" },
      { label: "角色变更", value: "3", detail: "过去 24 小时内更新的权限" },
      { label: "菜单提醒", value: "5", detail: "当前启用的临时售罄设置" },
    ],
    alerts: [
      { label: "员工邀请即将过期", severity: "warning", detail: "Leo Martin 的邀请将在 18 小时后过期。" },
      { label: "权限审计待处理", severity: "info", detail: "本周请复核经理级退款权限。" },
      { label: "系统菜单已同步", severity: "success", detail: "管理导航已匹配最新 SQL 种子。" },
    ],
    activity: [
      { id: "act_001", actor: "Mika Tanaka", action: "授予 USER_ROLE_ASSIGN", target: "Daniel Wong", at: "8:04 AM" },
      { id: "act_002", actor: "Daniel Wong", action: "发送员工邀请", target: "Leo Martin", at: "7:58 AM" },
      { id: "act_003", actor: "Sara Chen", action: "标记菜品不可售", target: "辣味金枪鱼卷", at: "昨天" },
    ],
  },
  ko: {
    stats: [
      { label: "열린 주문", value: "18", detail: "6건 준비 중, 4건 픽업 대기" },
      { label: "온라인 직원", value: "7", detail: "매니저 1명과 직원 6명 접속 중" },
      { label: "역할 변경", value: "3", detail: "최근 24시간 동안 업데이트된 권한" },
      { label: "메뉴 알림", value: "5", detail: "임시 품절 설정 활성화" },
    ],
    alerts: [
      { label: "직원 초대 만료 예정", severity: "warning", detail: "Leo Martin의 초대가 18시간 후 만료됩니다." },
      { label: "권한 감사 필요", severity: "info", detail: "이번 주 매니저 환불 권한을 검토하세요." },
      { label: "시스템 메뉴 동기화됨", severity: "success", detail: "관리 내비게이션이 최신 SQL 시드와 일치합니다." },
    ],
    activity: [
      { id: "act_001", actor: "Mika Tanaka", action: "USER_ROLE_ASSIGN 부여", target: "Daniel Wong", at: "8:04 AM" },
      { id: "act_002", actor: "Daniel Wong", action: "직원 초대 발송", target: "Leo Martin", at: "7:58 AM" },
      { id: "act_003", actor: "Sara Chen", action: "품목 판매 중지 표시", target: "스파이시 참치 롤", at: "어제" },
    ],
  },
} as const;

export function getLocalizedManagerDashboard(locale: Locale) {
  return dashboardTranslations[locale];
}

const roleTranslations = {
  en: {},
  zh: {
    Admin: ["管理员", "全局"],
    Manager: ["经理", "指定门店"],
    Staff: ["员工", "指定门店"],
  },
  ko: {
    Admin: ["관리자", "전체"],
    Manager: ["매니저", "지정 매장"],
    Staff: ["직원", "지정 매장"],
  },
} as const;

export function getLocalizedManagerRoleAccess(locale: Locale) {
  const translations = roleTranslations[locale] as Record<string, readonly [string, string]>;
  return managerRoleAccess.map((role) => {
    const translated = translations[role.label];
    return {
      ...role,
      label: translated?.[0] ?? role.label,
      scope: translated?.[1] ?? role.scope,
    };
  });
}

const permissionGroups = {
  zh: {
    Dashboard: "仪表盘",
    Stores: "门店",
    Users: "用户",
    Menus: "菜单",
    Orders: "订单",
    Rewards: "积分",
    Payments: "付款",
    Notifications: "通知",
    Audit: "审计",
    Settings: "设置",
  },
  ko: {
    Dashboard: "대시보드",
    Stores: "매장",
    Users: "사용자",
    Menus: "메뉴",
    Orders: "주문",
    Rewards: "리워드",
    Payments: "결제",
    Notifications: "알림",
    Audit: "감사",
    Settings: "설정",
  },
} as const;

export function getLocalizedManagerPermissions(locale: Locale) {
  const groups = locale === "en" ? undefined : permissionGroups[locale];
  return managerPermissions.map((permission) => ({
    ...permission,
    group: groups?.[permission.group as keyof typeof groups] ?? permission.group,
  }));
}

const userTranslations = {
  en: {},
  zh: {
    "All stores": "所有门店",
    "Toronto Main": "多伦多主店",
    "Customer account": "顾客账户",
    "Staff invite pending": "员工邀请待处理",
    "Today, 8:12 AM": "今天 8:12 AM",
    "Today, 7:46 AM": "今天 7:46 AM",
    "Yesterday, 6:25 PM": "昨天 6:25 PM",
    "Invite sent today": "今天已发送邀请",
  },
  ko: {
    "All stores": "모든 매장",
    "Toronto Main": "토론토 메인",
    "Customer account": "고객 계정",
    "Staff invite pending": "직원 초대 대기",
    "Today, 8:12 AM": "오늘 8:12 AM",
    "Today, 7:46 AM": "오늘 7:46 AM",
    "Yesterday, 6:25 PM": "어제 6:25 PM",
    "Invite sent today": "오늘 초대 발송",
  },
} as const;

export function getLocalizedManagerUsers(locale: Locale) {
  const translations = userTranslations[locale] as Record<string, string>;
  return managerUsers.map((user) => ({
    ...user,
    locationName: translations[user.locationName] ?? user.locationName,
    lastSeen: translations[user.lastSeen] ?? user.lastSeen,
  }));
}
