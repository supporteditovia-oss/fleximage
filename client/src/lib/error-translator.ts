import i18n from "@/i18n";

type ErrorTranslationEntry = {
  titleKey: string;
  descriptionKey: string;
};

const errorMap: Record<string, ErrorTranslationEntry> = {
  "Invalid login credentials": {
    titleKey: "errors.auth.invalidLoginCredentials.title",
    descriptionKey: "errors.auth.invalidLoginCredentials.description",
  },
  "User already registered": {
    titleKey: "errors.auth.userAlreadyRegistered.title",
    descriptionKey: "errors.auth.userAlreadyRegistered.description",
  },
  "Password should be at least 6 characters": {
    titleKey: "errors.auth.passwordTooShort.title",
    descriptionKey: "errors.auth.passwordTooShort.description",
  },
  "Email not confirmed": {
    titleKey: "errors.auth.emailNotConfirmed.title",
    descriptionKey: "errors.auth.emailNotConfirmed.description",
  },
  "Network request failed": {
    titleKey: "errors.auth.networkFailed.title",
    descriptionKey: "errors.auth.networkFailed.description",
  },
  "Too many requests": {
    titleKey: "errors.auth.tooManyRequests.title",
    descriptionKey: "errors.auth.tooManyRequests.description",
  },
  "Signup disabled": {
    titleKey: "errors.auth.signupDisabled.title",
    descriptionKey: "errors.auth.signupDisabled.description",
  },
  "Rate limit exceeded": {
    titleKey: "errors.auth.rateLimitExceeded.title",
    descriptionKey: "errors.auth.rateLimitExceeded.description",
  },
  "User not found": {
    titleKey: "errors.auth.userNotFound.title",
    descriptionKey: "errors.auth.userNotFound.description",
  },
  "Invalid email": {
    titleKey: "errors.auth.invalidEmail.title",
    descriptionKey: "errors.auth.invalidEmail.description",
  },
  "Database error saving next challenge": {
    titleKey: "errors.auth.databaseError.title",
    descriptionKey: "errors.auth.databaseError.description",
  },
  anonymous_provider_disabled: {
    titleKey: "errors.auth.anonymousDisabled.title",
    descriptionKey: "errors.auth.anonymousDisabled.description",
  },
  Confirmation_token_not_found: {
    titleKey: "errors.auth.confirmationTokenNotFound.title",
    descriptionKey: "errors.auth.confirmationTokenNotFound.description",
  },
  "Provider disabled": {
    titleKey: "errors.auth.providerDisabled.title",
    descriptionKey: "errors.auth.providerDisabled.description",
  },
};

function translateEntry(entry: ErrorTranslationEntry): {
  title: string;
  description: string;
} {
  return {
    title: i18n.t(entry.titleKey),
    description: i18n.t(entry.descriptionKey),
  };
}

export function translateSupabaseError(error: any): {
  title: string;
  description: string;
} {
  if (error?.status === 429 || error?.code === "over_query_limit") {
    return translateEntry(errorMap["Too many requests"]);
  }

  const message = error?.message || "";

  for (const key in errorMap) {
    if (message.includes(key) || error?.code === key) {
      return translateEntry(errorMap[key]);
    }
  }

  if (message.toLowerCase().includes("email")) {
    return translateEntry(errorMap["Invalid email"]);
  }

  return {
    title: i18n.t("errors.generic.title"),
    description: message || i18n.t("errors.generic.description"),
  };
}
