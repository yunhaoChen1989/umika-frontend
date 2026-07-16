export const profileCompletionPromptKey = "umika_profile_completion_prompt";
export const profileCompletionPromptEventName = "umika-profile-completion-prompt";

export function requestProfileCompletionPrompt() {
  localStorage.setItem(profileCompletionPromptKey, "1");
  window.dispatchEvent(new Event(profileCompletionPromptEventName));
}
