export type SystemSettingDto = {
  id?: string | null;
  settingGroup: string | null;
  settingKey: string;
  settingValue: string | null;
  description: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};
