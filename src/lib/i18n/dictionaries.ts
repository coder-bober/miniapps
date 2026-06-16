import { defaultLocale, type Locale } from "@/lib/i18n/config";

export type SiteDictionary = {
  seo: {
    title: string;
    description: string;
  };
  header: {
    brandTagline: string;
    languageLabel: string;
    nav: {
      product: string;
      metrics: string;
      workflow: string;
    };
    user: {
      name: string;
      profile: string;
      workspace: string;
      settings: string;
      signOut: string;
      navigationTitle: string;
    };
    theme: {
      dark: string;
      light: string;
    };
    auth: {
      signInLink: string;
      signUpLink: string;
    };
  };
  auth: {
    fields: {
      email: string;
      password: string;
      newPassword: string;
    };
    messages: {
      confirmEmail: string;
      profileSaved: string;
      passwordChangeComplete: string;
      passwordChangeFailed: string;
      passwordChangeMismatch: string;
      passwordChangeTooShort: string;
      sessionSignOutEverywhereComplete: string;
      sessionSignOutEverywhereFailed: string;
      accountDeletionComplete: string;
      accountDeletionFailed: string;
      accountDeletionMismatch: string;
      accountDeletionUnavailable: string;
      confirmationLinkResent: string;
      confirmationFailed: string;
      confirmationComplete: string;
      confirmationExpired: string;
      signInRequiresConfirmation: string;
      passwordResetSent: string;
      passwordResetComplete: string;
      passwordResetFailed: string;
      passwordResetInvalid: string;
    };
    actions: {
      resendConfirmation: string;
      backToSignIn: string;
      createAnotherAccount: string;
      forgotPassword: string;
      backToForgotPassword: string;
    };
    signIn: {
      title: string;
      description: string;
      submit: string;
      switchPrompt: string;
      switchAction: string;
    };
    signUp: {
      title: string;
      description: string;
      submit: string;
      switchPrompt: string;
      switchAction: string;
    };
    checkEmail: {
      title: string;
      description: string;
      resendDescription: string;
      emailLabel: string;
    };
    forgotPassword: {
      title: string;
      description: string;
      submit: string;
    };
    resetPassword: {
      title: string;
      description: string;
      submit: string;
    };
  };
  app: {
    profile: {
      eyebrow: string;
      title: string;
      description: string;
      highlights: string[];
      form: {
        title: string;
        description: string;
        emailLabel: string;
        fullNameLabel: string;
        usernameLabel: string;
        avatarUrlLabel: string;
        submit: string;
      };
    };
    workspace: {
      eyebrow: string;
      title: string;
      description: string;
      highlights: string[];
      membersTitle: string;
      membersDescription: string;
      membersPersonalNotice: string;
      membersOwnerOnlyNotice: string;
      membersLoading: string;
      membersLoadFailed: string;
      membersEmpty: string;
      membersAddTitle: string;
      membersAddEmailLabel: string;
      membersAddEmailPlaceholder: string;
      membersAddRoleLabel: string;
      membersAddSubmit: string;
      membersAddSuccess: string;
      membersRoleSave: string;
      membersRoleUpdateSuccess: string;
      membersRemoveSubmit: string;
      membersRemoveSuccess: string;
      membersTransferTitle: string;
      membersTransferDescription: string;
      membersTransferLabel: string;
      membersTransferSubmit: string;
      membersTransferSuccess: string;
      moduleLabAccessTitle: string;
      moduleLabAccessDescription: string;
      moduleLabAccessOwnerAdminNotice: string;
      moduleLabAccessReadOnlyNotice: string;
      moduleLabAccessNoAccess: string;
      moduleLabAccessViewer: string;
      moduleLabAccessOperator: string;
      moduleLabAccessSave: string;
      moduleLabAccessLoadFailed: string;
      moduleLabAccessUpdateSuccess: string;
      moduleLabAccessUpdateFailed: string;
      workspaceAccessTitle: string;
      workspaceAccessDescription: string;
      workspaceAccessNameColumn: string;
      workspaceAccessKindColumn: string;
      workspaceAccessRoleColumn: string;
      workspaceAccessActionColumn: string;
      workspaceAccessOpenAction: string;
      workspaceAccessPersonalOnlyNotice: string;
      workspaceAccessEmpty: string;
      workspacesLabel: string;
      workspacesHint: string;
      workspacesLoadFailed: string;
      filesTitle: string;
      filesDescription: string;
      filesUploadLabel: string;
      filesUploadHint: string;
      filesUploadSubmit: string;
      filesEmpty: string;
      filesLoadFailed: string;
      filesUploadComplete: string;
      filesUploadFailed: string;
      filesDeleteSubmit: string;
      filesDeleteComplete: string;
      filesDeleteFailed: string;
      filesThumbnailPending: string;
      filesThumbnailCompleted: string;
      filesThumbnailSkipped: string;
      filesThumbnailFailed: string;
      filesChecklist: string[];
    };
      moduleLab: {
        eyebrow: string;
        title: string;
        description: string;
        highlights: string[];
        cardTitle: string;
        cardDescription: string;
        publicGuestNotice: string;
        publicWorkspaceNotice: string;
        publicWorkspaceFallbackNotice: string;
        workspaceContextNotice: string;
        readOnlyNotice: string;
        accessDeniedNotice: string;
        sessionExpiredNotice: string;
        statusTitle: string;
        statusLoadFailed: string;
        actionLabel: string;
        actionSubmit: string;
        actionSuccess: string;
        actionFailed: string;
      idleState: string;
      jobsTitle: string;
    };
    settings: {
      eyebrow: string;
      title: string;
      description: string;
      highlights: string[];
      security: {
        title: string;
        description: string;
        newPasswordLabel: string;
        confirmPasswordLabel: string;
        helper: string;
        submit: string;
      };
      sessions: {
        title: string;
        description: string;
        currentSessionTitle: string;
        currentSessionDescription: string;
        currentSessionSubmit: string;
        allSessionsTitle: string;
        allSessionsDescription: string;
        allSessionsSubmit: string;
      };
      dangerZone: {
        title: string;
        description: string;
        confirmationLabel: string;
        confirmationHelp: string;
        submit: string;
        unavailableNote: string;
      };
    };
    shared: {
      localeLabel: string;
      surfaceLabel: string;
      surfaceValue: string;
      modeLabel: string;
      modeValue: string;
        highlightsTitle: string;
        workspaceLabel: string;
        workspaceHint: string;
        workspaceUnavailable: string;
        workspaceCreateAction: string;
        workspaceCreateTitle: string;
        workspaceCreateHint: string;
        workspaceCreateLabel: string;
        workspaceCreatePlaceholder: string;
        workspaceCreateSubmit: string;
        workspaceCreateCancel: string;
        workspaceCreateFailed: string;
        workspaceFallbackNotice: string;
        workspaceKindPersonal: string;
        workspaceKindShared: string;
      workspaceRoleOwner: string;
      workspaceRoleAdmin: string;
      workspaceRoleMember: string;
    };
  };
  home: {
    badge: string;
    heroTitle: string;
    heroDescription: string;
    primaryCta: string;
    secondaryCta: string;
    stats: Array<{
      label: string;
      value: string;
      detail: string;
    }>;
    workspace: {
      eyebrow: string;
      title: string;
      status: string;
      healthScore: string;
      renewalsRisk: string;
      updated: string;
      automatedCoverage: string;
      automatedCoverageValue: string;
      automatedCoverageDetail: string;
      expansionPulse: string;
      expansionPulseValue: string;
      expansionPulseDetail: string;
      executiveReadout: string;
      executiveTitle: string;
      highlights: string[];
    };
    features: Array<{
      title: string;
      description: string;
    }>;
    workflow: {
      badge: string;
      title: string;
      description: string;
      steps: Array<{
        title: string;
        description: string;
      }>;
    };
  };
};

const en: SiteDictionary = {
  seo: {
    title: "QuietShift | Operational intelligence for modern SaaS teams",
    description:
      "QuietShift unifies product, billing, and support signals so SaaS teams see risk early and coordinate action before churn becomes visible.",
  },
  header: {
    brandTagline: "SaaS operations command center",
    languageLabel: "Language",
    nav: {
      product: "Product",
      metrics: "Metrics",
      workflow: "Workflow",
    },
    user: {
      name: "Avery Stone",
      profile: "Profile",
      workspace: "Workspace",
      settings: "Settings",
      signOut: "Sign out",
      navigationTitle: "Navigate",
    },
    theme: {
      dark: "Switch to dark theme",
      light: "Switch to light theme",
    },
    auth: {
      signInLink: "Sign in",
      signUpLink: "Create account",
    },
  },
  auth: {
    fields: {
      email: "Email",
      password: "Password",
      newPassword: "New password",
    },
    messages: {
      confirmEmail: "Check your email to confirm your account before signing in.",
      profileSaved: "Profile changes saved.",
      passwordChangeComplete: "Your password has been updated.",
      passwordChangeFailed: "We could not update your password. Try again.",
      passwordChangeMismatch: "The password confirmation does not match.",
      passwordChangeTooShort: "Use at least 8 characters for the new password.",
      sessionSignOutEverywhereComplete: "All active sessions have been signed out.",
      sessionSignOutEverywhereFailed: "We could not sign out the other sessions. Try again.",
      accountDeletionComplete: "Your account has been deleted.",
      accountDeletionFailed: "We could not delete your account. Try again.",
      accountDeletionMismatch: "Enter your account email exactly to confirm deletion.",
      accountDeletionUnavailable: "Account deletion is not configured in this environment.",
      confirmationLinkResent: "A new confirmation email has been sent.",
      confirmationFailed: "We could not confirm your account link. Request a new email and try again.",
      confirmationComplete: "Your email is confirmed. You can sign in now.",
      confirmationExpired: "Your confirmation link is missing or expired. Request a new confirmation email.",
      signInRequiresConfirmation: "Your email is not confirmed yet. Check your inbox or request a new confirmation email.",
      passwordResetSent: "Check your email for a password reset link.",
      passwordResetComplete: "Your password has been updated. Sign in with the new password.",
      passwordResetFailed: "We could not update your password. Try the recovery link again.",
      passwordResetInvalid: "Your recovery session is missing or expired. Request a new password reset email.",
    },
    actions: {
      resendConfirmation: "Resend confirmation email",
      backToSignIn: "Back to sign in",
      createAnotherAccount: "Create another account",
      forgotPassword: "Forgot password?",
      backToForgotPassword: "Back to password recovery",
    },
    signIn: {
      title: "Sign in",
      description: "Access your workspace with your email and password.",
      submit: "Sign in",
      switchPrompt: "Need an account?",
      switchAction: "Create one",
    },
    signUp: {
      title: "Create account",
      description: "Create your QuietShift account to access the protected workspace.",
      submit: "Create account",
      switchPrompt: "Already have an account?",
      switchAction: "Sign in",
    },
    checkEmail: {
      title: "Confirm your email",
      description: "We sent a confirmation link to your inbox. Open it to finish activating your account.",
      resendDescription: "If the email did not arrive, you can request a new confirmation link.",
      emailLabel: "Confirmation email",
    },
    forgotPassword: {
      title: "Reset your password",
      description: "Enter your email and we will send you a password recovery link.",
      submit: "Send reset link",
    },
    resetPassword: {
      title: "Choose a new password",
      description: "Set a new password for your QuietShift account.",
      submit: "Update password",
    },
  },
  app: {
    profile: {
      eyebrow: "Account identity",
      title: "Profile",
      description: "Manage your account identity, role, and cross-functional visibility settings.",
      highlights: [
        "Role-aware permissions mapped to revops, support, and product workflows",
        "Shared identity and ownership context across every customer account",
        "Localized account surfaces ready for English and Russian operators",
      ],
      form: {
        title: "Public profile details",
        description: "Set the values that appear in your app shell, account ownership context, and future teammate views.",
        emailLabel: "Email",
        fullNameLabel: "Full name",
        usernameLabel: "Username",
        avatarUrlLabel: "Avatar URL",
        submit: "Save profile",
      },
    },
    workspace: {
      eyebrow: "Operational workspace",
      title: "Workspace",
      description: "Review active teams, automation coverage, and operating defaults for your SaaS org.",
      highlights: [
        "Automation coverage and exceptions visible in one operating layer",
        "Shared defaults for revenue, customer, and product workflows",
        "Team-level visibility across regions and account portfolios",
      ],
      membersTitle: "Members",
      membersDescription: "Review who currently belongs to this workspace and what baseline role each member has.",
      membersPersonalNotice:
        "Personal workspaces stay single-user. Member management is available only for shared workspaces.",
      membersOwnerOnlyNotice:
        "Member management actions are owner-only in the current MVP. Other members can view the list but cannot change it yet.",
      membersLoading: "Loading members...",
      membersLoadFailed: "We could not load the current workspace members. Try again.",
      membersEmpty: "No members were found for this workspace.",
      membersAddTitle: "Add member",
      membersAddEmailLabel: "User email",
      membersAddEmailPlaceholder: "teammate@example.com",
      membersAddRoleLabel: "Role",
      membersAddSubmit: "Add member",
      membersAddSuccess: "The workspace member was added.",
      membersRoleSave: "Save role",
      membersRoleUpdateSuccess: "The workspace member role was updated.",
      membersRemoveSubmit: "Remove",
      membersRemoveSuccess: "The workspace member was removed.",
      membersTransferTitle: "Transfer ownership",
      membersTransferDescription:
        "Select an existing member to become the new owner. The current owner will become an admin.",
      membersTransferLabel: "New owner",
      membersTransferSubmit: "Transfer ownership",
      membersTransferSuccess: "Workspace ownership was transferred.",
      moduleLabAccessTitle: "ModuleLab access",
      moduleLabAccessDescription:
        "Control who can use the ModuleLab diagnostics surface inside this workspace.",
      moduleLabAccessOwnerAdminNotice:
        "Workspace owners and admins can change ModuleLab access for current workspace members.",
      moduleLabAccessReadOnlyNotice:
        "Your workspace role can view ModuleLab access, but cannot change it.",
      moduleLabAccessNoAccess: "No access",
      moduleLabAccessViewer: "Viewer",
      moduleLabAccessOperator: "Operator",
      moduleLabAccessSave: "Save access",
      moduleLabAccessLoadFailed: "We could not load ModuleLab access. Try again.",
      moduleLabAccessUpdateSuccess: "ModuleLab access was updated.",
      moduleLabAccessUpdateFailed: "We could not update ModuleLab access. Try again.",
      workspaceAccessTitle: "Workspace access",
      workspaceAccessDescription:
        "Review the first workspaces you belong to and open the selected workspace context.",
      workspaceAccessNameColumn: "Workspace",
      workspaceAccessKindColumn: "Kind",
      workspaceAccessRoleColumn: "Your role",
      workspaceAccessActionColumn: "Action",
      workspaceAccessOpenAction: "Open",
      workspaceAccessPersonalOnlyNotice:
        "This overview is shown from your personal workspace so you can jump into shared workspace contexts.",
      workspaceAccessEmpty: "Your personal workspace is the only workspace so far.",
      workspacesLabel: "Workspace",
      workspacesHint: "Switch between your personal and shared workspaces.",
      workspacesLoadFailed: "We could not load the available workspaces. Try again.",
      filesTitle: "File upload foundation",
      filesDescription:
        "Workspace file upload is being prepared as a backend-owned feature on Fastify with S3-compatible storage.",
      filesUploadLabel: "Upload a workspace file",
      filesUploadHint: "The first iteration supports small images, PDFs, and plain text files.",
      filesUploadSubmit: "Upload file",
      filesEmpty: "No files uploaded yet.",
      filesLoadFailed: "We could not load the workspace files. Try again.",
      filesUploadComplete: "The file was uploaded.",
      filesUploadFailed: "We could not upload the file. Try again.",
      filesDeleteSubmit: "Delete",
      filesDeleteComplete: "The file was deleted.",
      filesDeleteFailed: "We could not delete the file. Try again.",
      filesThumbnailPending: "Preview is being generated.",
      filesThumbnailCompleted: "Preview is ready.",
      filesThumbnailSkipped: "Preview is not available for this file type yet.",
      filesThumbnailFailed: "Preview generation failed.",
      filesChecklist: [
        "Local SeaweedFS S3-backed storage configuration",
        "Fastify-side file validation with magic bytes",
        "Reusable metadata contracts for future workspace files",
      ],
    },
      moduleLab: {
        eyebrow: "Module diagnostics",
        title: "Module Lab",
        description: "Exercise the modular-monolith extension path with one controlled feature surface.",
        highlights: [
        "Frontend manifest, nav, and protected route wiring in one module",
        "Same-origin Next proxy route mapped to Fastify backend ownership",
        "BullMQ job registration and worker execution path for module-owned background work",
        ],
        cardTitle: "Module health probe",
        cardDescription: "This internal module exists to prove that frontend, backend, and worker contracts stay coherent as the modular foundation grows.",
        publicGuestNotice: "Sign in to run module diagnostics and queue the test job. The public page stays indexable so modules can own SEO-facing surfaces too.",
        publicWorkspaceNotice: "Viewing the public module surface for {workspace}.",
        publicWorkspaceFallbackNotice: "The requested public workspace is unavailable. Showing the default module view instead.",
        workspaceContextNotice: "Diagnostics are currently scoped to {workspace}.",
        readOnlyNotice: "Your account can review module diagnostics, but it cannot queue module jobs.",
        accessDeniedNotice: "Your account is signed in, but it does not have access to the module-lab diagnostics surface.",
        sessionExpiredNotice: "Your session is no longer valid. Sign in again to access module diagnostics.",
        statusTitle: "Registered backend jobs",
        statusLoadFailed: "We could not load the module diagnostics. Try again.",
        actionLabel: "Job message",
        actionSubmit: "Queue module job",
        actionSuccess: "The module job was queued.",
      actionFailed: "The module job could not be queued. Try again.",
      idleState: "No module action has been triggered yet.",
      jobsTitle: "Jobs exposed by this module",
    },
    settings: {
      eyebrow: "Platform controls",
      title: "Settings",
      description: "Control preferences, notifications, and operational policies across the workspace.",
      highlights: [
        "Notification rules aligned with account risk and renewal timing",
        "Policy controls for approvals, ownership, and escalation paths",
        "Localization-ready preference surfaces for multilingual teams",
      ],
      security: {
        title: "Change password",
        description: "Update the password used for your current QuietShift account.",
        newPasswordLabel: "New password",
        confirmPasswordLabel: "Confirm new password",
        helper: "Use at least 8 characters. The change applies to future sign-ins immediately.",
        submit: "Save new password",
      },
      sessions: {
        title: "Sessions",
        description: "Manage how this account stays signed in across devices.",
        currentSessionTitle: "Current device",
        currentSessionDescription: "End the active session on this device immediately if you are finished working.",
        currentSessionSubmit: "Sign out on this device",
        allSessionsTitle: "All devices",
        allSessionsDescription: "Revoke the active sessions for this account across every device and browser, then sign out the current one too.",
        allSessionsSubmit: "Sign out everywhere",
      },
      dangerZone: {
        title: "Delete account",
        description: "Permanently delete your account and remove access to the protected workspace.",
        confirmationLabel: "Confirm with your account email",
        confirmationHelp: "This action is permanent. Enter your current account email to continue.",
        submit: "Delete account",
        unavailableNote: "This action requires the server-only SUPABASE_SERVICE_ROLE_KEY. It is currently disabled in this environment.",
      },
    },
    shared: {
      localeLabel: "Locale",
      surfaceLabel: "Surface",
      surfaceValue: "App",
      modeLabel: "Mode",
      modeValue: "Localized",
        highlightsTitle: "What this page is designed for",
        workspaceLabel: "Workspace",
        workspaceHint: "Switch the current workspace context for app modules.",
        workspaceUnavailable: "We could not load the available workspaces.",
        workspaceCreateAction: "New workspace",
        workspaceCreateTitle: "Create workspace",
        workspaceCreateHint: "Create a shared workspace that can later hold modules, files, and memberships beyond your personal default workspace.",
        workspaceCreateLabel: "Workspace name",
        workspaceCreatePlaceholder: "Team operations",
        workspaceCreateSubmit: "Create workspace",
        workspaceCreateCancel: "Cancel",
        workspaceCreateFailed: "The workspace could not be created. Try again.",
        workspaceFallbackNotice:
          "The requested workspace is not available. Showing your personal workspace.",
      workspaceKindPersonal: "Personal",
      workspaceKindShared: "Shared",
      workspaceRoleOwner: "Owner",
      workspaceRoleAdmin: "Admin",
      workspaceRoleMember: "Member",
    },
  },
  home: {
    badge: "Built for product-led SaaS teams",
    heroTitle: "See risk early. Coordinate action before churn becomes visible.",
    heroDescription:
      "QuietShift gives operators, finance, and customer teams one live surface for usage signals, account health, and revenue decisions.",
    primaryCta: "Launch Workspace",
    secondaryCta: "View Demo",
    stats: [
      {
        label: "Net revenue retention",
        value: "118.4%",
        detail: "+4.9 points over the last 60 days",
      },
      {
        label: "Accounts monitored",
        value: "1,284",
        detail: "Unified product, billing, and support telemetry",
      },
      {
        label: "Median response time",
        value: "12 min",
        detail: "Automated workflows closing gaps before handoff",
      },
    ],
    workspace: {
      eyebrow: "Live workspace",
      title: "Monday readiness",
      status: "Stable",
      healthScore: "Health score",
      renewalsRisk: "Renewals at risk",
      updated: "Updated 3 minutes ago",
      automatedCoverage: "Automated coverage",
      automatedCoverageValue: "91%",
      automatedCoverageDetail:
        "Playbooks resolved 38 of 42 active exceptions without manual coordination.",
      expansionPulse: "Weekly expansion pulse",
      expansionPulseValue: "$420k",
      expansionPulseDetail:
        "In qualified upsell opportunities surfaced from usage and seat growth.",
      executiveReadout: "Executive readout",
      executiveTitle: "Every strategic account, one operating view",
      highlights: [
        "Customer health briefs generated automatically",
        "Cross-functional account actions routed instantly",
        "Expansion and churn signals scored continuously",
      ],
    },
    features: [
      {
        title: "Revenue visibility",
        description:
          "Track renewals, expansion signals, and risk drivers across product usage, support, and billing in one workspace.",
      },
      {
        title: "Automated execution",
        description:
          "Turn health changes into routed tasks and approvals so teams act on the same data without manual handoffs.",
      },
      {
        title: "Operational control",
        description:
          "Keep every decision auditable with approval checkpoints, ownership history, and role-aware workflows.",
      },
    ],
    workflow: {
      badge: "Workflow example",
      title: "From weak signal to account action in minutes",
      description:
        "QuietShift assembles telemetry, account context, and recommended follow-through so customer-facing teams can move without waiting on manual reporting. The point on desktop is visibility: operators should be able to scan narrative, actions, and status in parallel instead of reading one narrow column.",
      steps: [
        {
          title: "Detect",
          description:
            "Usage shifts and payment delays trigger a shared account risk view.",
        },
        {
          title: "Assemble",
          description:
            "The system drafts a brief with owner notes, support history, and contract timing.",
        },
        {
          title: "Execute",
          description:
            "Tasks route to the right teams with approvals and accountability already attached.",
        },
      ],
    },
  },
};

const ru: SiteDictionary = {
  seo: {
    title: "QuietShift | Операционная аналитика для современных SaaS-команд",
    description:
      "QuietShift объединяет продуктовые, биллинговые и support-сигналы, чтобы SaaS-команды заранее видели риск и координировали действия до того, как отток станет очевидным.",
  },
  header: {
    brandTagline: "Центр управления SaaS-операциями",
    languageLabel: "Язык",
    nav: {
      product: "Продукт",
      metrics: "Метрики",
      workflow: "Процесс",
    },
    user: {
      name: "Avery Stone",
      profile: "Профиль",
      workspace: "Рабочее пространство",
      settings: "Настройки",
      signOut: "Выйти",
      navigationTitle: "Навигация",
    },
    theme: {
      dark: "Переключить на темную тему",
      light: "Переключить на светлую тему",
    },
    auth: {
      signInLink: "Войти",
      signUpLink: "Регистрация",
    },
  },
  auth: {
    fields: {
      email: "Email",
      password: "Пароль",
      newPassword: "Новый пароль",
    },
    messages: {
      confirmEmail: "Подтвердите аккаунт через письмо перед входом.",
      profileSaved: "Изменения профиля сохранены.",
      passwordChangeComplete: "Пароль обновлен.",
      passwordChangeFailed: "Не удалось обновить пароль. Попробуйте еще раз.",
      passwordChangeMismatch: "Подтверждение пароля не совпадает.",
      passwordChangeTooShort: "Новый пароль должен содержать не менее 8 символов.",
      sessionSignOutEverywhereComplete: "Все активные сессии завершены.",
      sessionSignOutEverywhereFailed: "Не удалось завершить другие сессии. Попробуйте еще раз.",
      accountDeletionComplete: "Аккаунт удален.",
      accountDeletionFailed: "Не удалось удалить аккаунт. Попробуйте еще раз.",
      accountDeletionMismatch: "Для подтверждения удаления введите email аккаунта без изменений.",
      accountDeletionUnavailable: "Удаление аккаунта не настроено для этого окружения.",
      confirmationLinkResent: "Новое письмо для подтверждения отправлено.",
      confirmationFailed: "Не удалось подтвердить ссылку. Запросите новое письмо и попробуйте снова.",
      confirmationComplete: "Email подтвержден. Теперь можно войти.",
      confirmationExpired: "Ссылка подтверждения отсутствует или истекла. Запросите новое письмо.",
      signInRequiresConfirmation: "Email еще не подтвержден. Проверьте входящие или запросите новое письмо.",
      passwordResetSent: "Проверьте почту: мы отправили ссылку для сброса пароля.",
      passwordResetComplete: "Пароль обновлен. Теперь можно войти с новым паролем.",
      passwordResetFailed: "Не удалось обновить пароль. Повторите переход по ссылке восстановления.",
      passwordResetInvalid: "Сессия восстановления отсутствует или истекла. Запросите новое письмо для сброса пароля.",
    },
    actions: {
      resendConfirmation: "Отправить письмо повторно",
      backToSignIn: "Назад ко входу",
      createAnotherAccount: "Создать другой аккаунт",
      forgotPassword: "Забыли пароль?",
      backToForgotPassword: "Назад к восстановлению пароля",
    },
    signIn: {
      title: "Вход",
      description: "Войдите в рабочее пространство с помощью email и пароля.",
      submit: "Войти",
      switchPrompt: "Нет аккаунта?",
      switchAction: "Создать",
    },
    signUp: {
      title: "Создать аккаунт",
      description: "Создайте аккаунт QuietShift, чтобы получить доступ к защищенному рабочему пространству.",
      submit: "Создать аккаунт",
      switchPrompt: "Уже есть аккаунт?",
      switchAction: "Войти",
    },
    checkEmail: {
      title: "Подтвердите email",
      description: "Мы отправили ссылку подтверждения на вашу почту. Откройте ее, чтобы активировать аккаунт.",
      resendDescription: "Если письмо не пришло, можно запросить новую ссылку подтверждения.",
      emailLabel: "Email для подтверждения",
    },
    forgotPassword: {
      title: "Сбросить пароль",
      description: "Введите email, и мы отправим ссылку для восстановления пароля.",
      submit: "Отправить ссылку",
    },
    resetPassword: {
      title: "Задайте новый пароль",
      description: "Укажите новый пароль для аккаунта QuietShift.",
      submit: "Обновить пароль",
    },
  },
  app: {
    profile: {
      eyebrow: "Идентичность аккаунта",
      title: "Профиль",
      description: "Управляйте учетной записью, ролью и параметрами видимости между командами.",
      highlights: [
        "Права доступа, завязанные на revops, поддержку и продуктовые процессы",
        "Единый контекст личности и владения для каждого клиентского аккаунта",
        "Локализованные интерфейсы для англоязычных и русскоязычных операторов",
      ],
      form: {
        title: "Данные профиля",
        description: "Настройте значения, которые отображаются в приложении, контексте владения аккаунтами и будущих представлениях для команды.",
        emailLabel: "Email",
        fullNameLabel: "Полное имя",
        usernameLabel: "Имя пользователя",
        avatarUrlLabel: "URL аватара",
        submit: "Сохранить профиль",
      },
    },
    workspace: {
      eyebrow: "Операционное пространство",
      title: "Рабочее пространство",
      description: "Просматривайте команды, покрытие автоматизации и операционные настройки вашей SaaS-организации.",
      highlights: [
        "Покрытие автоматизации и исключения видны в одном операционном слое",
        "Единые настройки для revenue, customer и product workflows",
        "Видимость на уровне команд по регионам и портфелям аккаунтов",
      ],
      membersTitle: "Участники",
      membersDescription:
        "Посмотрите, кто сейчас состоит в этом рабочем пространстве и какую базовую роль имеет каждый участник.",
      membersPersonalNotice:
        "Личные рабочие пространства остаются одно-пользовательскими. Управление участниками доступно только для общих рабочих пространств.",
      membersOwnerOnlyNotice:
        "В текущем MVP управлять участниками может только владелец. Остальные участники видят список, но пока не могут его изменять.",
      membersLoading: "Загрузка участников...",
      membersLoadFailed: "Не удалось загрузить участников текущего рабочего пространства. Попробуйте еще раз.",
      membersEmpty: "Для этого рабочего пространства не найдено участников.",
      membersAddTitle: "Добавить участника",
      membersAddEmailLabel: "Email пользователя",
      membersAddEmailPlaceholder: "teammate@example.com",
      membersAddRoleLabel: "Роль",
      membersAddSubmit: "Добавить участника",
      membersAddSuccess: "Участник добавлен в рабочее пространство.",
      membersRoleSave: "Сохранить роль",
      membersRoleUpdateSuccess: "Роль участника обновлена.",
      membersRemoveSubmit: "Удалить",
      membersRemoveSuccess: "Участник удален из рабочего пространства.",
      membersTransferTitle: "Передать владение",
      membersTransferDescription:
        "Выберите существующего участника, который станет новым владельцем. Текущий владелец станет администратором.",
      membersTransferLabel: "Новый владелец",
      membersTransferSubmit: "Передать владение",
      membersTransferSuccess: "Владение рабочим пространством передано.",
      moduleLabAccessTitle: "Доступ к ModuleLab",
      moduleLabAccessDescription:
        "Управляйте тем, кто может использовать диагностическую поверхность ModuleLab в этом рабочем пространстве.",
      moduleLabAccessOwnerAdminNotice:
        "Владельцы и администраторы рабочего пространства могут менять доступ к ModuleLab для текущих участников.",
      moduleLabAccessReadOnlyNotice:
        "Ваша роль в рабочем пространстве позволяет видеть доступ к ModuleLab, но не менять его.",
      moduleLabAccessNoAccess: "Нет доступа",
      moduleLabAccessViewer: "Просмотр",
      moduleLabAccessOperator: "Оператор",
      moduleLabAccessSave: "Сохранить доступ",
      moduleLabAccessLoadFailed: "Не удалось загрузить доступ к ModuleLab. Попробуйте еще раз.",
      moduleLabAccessUpdateSuccess: "Доступ к ModuleLab обновлен.",
      moduleLabAccessUpdateFailed: "Не удалось обновить доступ к ModuleLab. Попробуйте еще раз.",
      workspaceAccessTitle: "Доступ к рабочим пространствам",
      workspaceAccessDescription:
        "Просмотрите первые рабочие пространства, где вы состоите, и откройте выбранный контекст.",
      workspaceAccessNameColumn: "Рабочее пространство",
      workspaceAccessKindColumn: "Тип",
      workspaceAccessRoleColumn: "Ваша роль",
      workspaceAccessActionColumn: "Действие",
      workspaceAccessOpenAction: "Открыть",
      workspaceAccessPersonalOnlyNotice:
        "Этот обзор показан в личном рабочем пространстве, чтобы быстро перейти в общие контексты.",
      workspaceAccessEmpty: "Пока доступно только ваше личное рабочее пространство.",
      workspacesLabel: "Рабочее пространство",
      workspacesHint: "Переключайтесь между личным и общими рабочими пространствами.",
      workspacesLoadFailed: "Не удалось загрузить доступные рабочие пространства. Попробуйте еще раз.",
      filesTitle: "Основа загрузки файлов",
      filesDescription:
        "Загрузка файлов в рабочем пространстве готовится как backend-функция на Fastify с S3-совместимым хранилищем.",
      filesUploadLabel: "Загрузить файл в рабочее пространство",
      filesUploadHint: "В первой версии поддерживаются небольшие изображения, PDF и текстовые файлы.",
      filesUploadSubmit: "Загрузить файл",
      filesEmpty: "Файлы пока не загружены.",
      filesLoadFailed: "Не удалось загрузить файлы рабочего пространства. Попробуйте еще раз.",
      filesUploadComplete: "Файл загружен.",
      filesUploadFailed: "Не удалось загрузить файл. Попробуйте еще раз.",
      filesDeleteSubmit: "Удалить",
      filesDeleteComplete: "Файл удален.",
      filesDeleteFailed: "Не удалось удалить файл. Попробуйте еще раз.",
      filesThumbnailPending: "Превью создается.",
      filesThumbnailCompleted: "Превью готово.",
      filesThumbnailSkipped: "Для этого типа файла превью пока недоступно.",
      filesThumbnailFailed: "Не удалось создать превью.",
      filesChecklist: [
        "Локальная конфигурация S3-хранилища на SeaweedFS",
        "Проверка файлов на стороне Fastify по magic bytes",
        "Переиспользуемые контракты метаданных для будущих файлов рабочего пространства",
      ],
    },
      moduleLab: {
        eyebrow: "Диагностика модулей",
        title: "Лаборатория модулей",
        description: "Проверьте путь расширения modular monolith через одну контролируемую функциональную поверхность.",
        highlights: [
        "Frontend manifest, навигация и защищенный route в одном модуле",
        "Same-origin Next proxy route, связанный с backend-владением в Fastify",
        "Регистрация BullMQ jobs и worker path для модульной фоновой обработки",
        ],
        cardTitle: "Проверка здоровья модуля",
        cardDescription: "Этот внутренний модуль существует, чтобы подтверждать согласованность frontend, backend и worker-контрактов по мере роста modular foundation.",
        publicGuestNotice: "Войдите, чтобы запускать диагностику модуля и ставить тестовую job в очередь. Публичная страница при этом остается индексируемой и пригодной для SEO-поверхностей модулей.",
        publicWorkspaceNotice: "Вы просматриваете публичную поверхность модуля для рабочего пространства {workspace}.",
        publicWorkspaceFallbackNotice: "Запрошенное публичное рабочее пространство недоступно. Вместо него показана базовая поверхность модуля.",
        workspaceContextNotice: "Диагностика сейчас привязана к рабочему пространству {workspace}.",
        readOnlyNotice: "Ваш аккаунт может просматривать диагностику модуля, но не может ставить модульные jobs в очередь.",
        accessDeniedNotice: "Вы вошли в аккаунт, но у него нет доступа к диагностической поверхности module-lab.",
        sessionExpiredNotice: "Сессия больше недействительна. Войдите снова, чтобы получить доступ к диагностике модуля.",
        statusTitle: "Зарегистрированные backend jobs",
        statusLoadFailed: "Не удалось загрузить диагностику модуля. Попробуйте еще раз.",
        actionLabel: "Сообщение для job",
        actionSubmit: "Поставить job в очередь",
        actionSuccess: "Job модуля поставлена в очередь.",
      actionFailed: "Не удалось поставить job модуля в очередь. Попробуйте еще раз.",
      idleState: "Действие модуля еще не запускалось.",
      jobsTitle: "Jobs, которые экспортирует этот модуль",
    },
    settings: {
      eyebrow: "Управление платформой",
      title: "Настройки",
      description: "Контролируйте предпочтения, уведомления и операционные политики рабочего пространства.",
      highlights: [
        "Правила уведомлений, связанные с риском аккаунта и сроками продления",
        "Политики для согласований, владельцев и escalation paths",
        "Подготовленные к локализации настройки для многоязычных команд",
      ],
      security: {
        title: "Смена пароля",
        description: "Обновите пароль, который используется для текущего аккаунта QuietShift.",
        newPasswordLabel: "Новый пароль",
        confirmPasswordLabel: "Подтвердите новый пароль",
        helper: "Используйте не менее 8 символов. Новый пароль будет применяться ко всем следующим входам.",
        submit: "Сохранить новый пароль",
      },
      sessions: {
        title: "Сессии",
        description: "Управляйте тем, как этот аккаунт остается авторизованным на устройствах.",
        currentSessionTitle: "Текущее устройство",
        currentSessionDescription: "Немедленно завершите активную сессию на этом устройстве, если закончили работу.",
        currentSessionSubmit: "Выйти на этом устройстве",
        allSessionsTitle: "Все устройства",
        allSessionsDescription: "Отзовите активные сессии этого аккаунта на всех устройствах и в браузерах, а затем завершите текущую тоже.",
        allSessionsSubmit: "Выйти везде",
      },
      dangerZone: {
        title: "Удаление аккаунта",
        description: "Навсегда удалите аккаунт и закройте доступ к защищенному рабочему пространству.",
        confirmationLabel: "Подтвердите email аккаунта",
        confirmationHelp: "Это действие необратимо. Введите текущий email аккаунта, чтобы продолжить.",
        submit: "Удалить аккаунт",
        unavailableNote: "Для этого действия нужен серверный ключ SUPABASE_SERVICE_ROLE_KEY. В текущем окружении функция отключена.",
      },
    },
    shared: {
      localeLabel: "Локаль",
      surfaceLabel: "Поверхность",
      surfaceValue: "Приложение",
      modeLabel: "Режим",
      modeValue: "Локализованный",
        highlightsTitle: "Для чего предназначена эта страница",
        workspaceLabel: "Рабочее пространство",
        workspaceHint: "Переключайте текущее рабочее пространство для модулей приложения.",
        workspaceUnavailable: "Не удалось загрузить доступные рабочие пространства.",
        workspaceCreateAction: "Новое пространство",
        workspaceCreateTitle: "Создать пространство",
        workspaceCreateHint: "Создайте общее рабочее пространство, в котором позже можно будет размещать модули, файлы и участников помимо вашего личного пространства по умолчанию.",
        workspaceCreateLabel: "Название пространства",
        workspaceCreatePlaceholder: "Команда операций",
        workspaceCreateSubmit: "Создать пространство",
        workspaceCreateCancel: "Отмена",
        workspaceCreateFailed: "Не удалось создать рабочее пространство. Попробуйте еще раз.",
        workspaceFallbackNotice:
          "Запрошенное рабочее пространство недоступно. Показано ваше личное рабочее пространство.",
      workspaceKindPersonal: "Личное",
      workspaceKindShared: "Общее",
      workspaceRoleOwner: "Владелец",
      workspaceRoleAdmin: "Админ",
      workspaceRoleMember: "Участник",
    },
  },
  home: {
    badge: "Создано для product-led SaaS-команд",
    heroTitle: "Видьте риск раньше. Координируйте действия до того, как отток станет заметен.",
    heroDescription:
      "QuietShift дает операционным, финансовым и customer-командам единый живой слой для сигналов использования, здоровья аккаунтов и выручки.",
    primaryCta: "Открыть рабочее пространство",
    secondaryCta: "Смотреть демо",
    stats: [
      {
        label: "Net revenue retention",
        value: "118.4%",
        detail: "+4.9 пункта за последние 60 дней",
      },
      {
        label: "Аккаунтов под наблюдением",
        value: "1,284",
        detail: "Единая телеметрия продукта, биллинга и поддержки",
      },
      {
        label: "Медианное время реакции",
        value: "12 мин",
        detail: "Автоматизация закрывает разрывы до передачи между командами",
      },
    ],
    workspace: {
      eyebrow: "Живое рабочее пространство",
      title: "Готовность к понедельнику",
      status: "Стабильно",
      healthScore: "Индекс здоровья",
      renewalsRisk: "Продления под риском",
      updated: "Обновлено 3 минуты назад",
      automatedCoverage: "Автоматизированное покрытие",
      automatedCoverageValue: "91%",
      automatedCoverageDetail:
        "Плейбуки закрыли 38 из 42 активных исключений без ручной координации.",
      expansionPulse: "Пульс расширения за неделю",
      expansionPulseValue: "$420k",
      expansionPulseDetail:
        "Квалифицированные возможности upsell, найденные по росту использования и мест.",
      executiveReadout: "Сводка для руководства",
      executiveTitle: "Для каждого стратегического аккаунта один операционный взгляд",
      highlights: [
        "Брифы по здоровью клиентов генерируются автоматически",
        "Межфункциональные действия по аккаунтам маршрутизируются мгновенно",
        "Сигналы на expansion и churn оцениваются непрерывно",
      ],
    },
    features: [
      {
        title: "Прозрачность выручки",
        description:
          "Отслеживайте продления, сигналы роста и факторы риска по данным продукта, поддержки и биллинга в одном рабочем пространстве.",
      },
      {
        title: "Автоматизированное исполнение",
        description:
          "Преобразуйте изменения здоровья аккаунта в маршрутизированные задачи и согласования, чтобы команды действовали по одним и тем же данным.",
      },
      {
        title: "Операционный контроль",
        description:
          "Сохраняйте проверяемость каждого решения с помощью точек согласования, истории владельцев и role-aware workflows.",
      },
    ],
    workflow: {
      badge: "Пример процесса",
      title: "От слабого сигнала до действия по аккаунту за минуты",
      description:
        "QuietShift собирает телеметрию, контекст аккаунта и рекомендуемые шаги, чтобы customer-команды могли действовать без ожидания ручной отчетности. На десктопе это особенно важно: оператор должен видеть narrative, действия и статус параллельно, а не читать одну узкую колонку.",
      steps: [
        {
          title: "Обнаружение",
          description:
            "Сдвиги в использовании и задержки оплаты формируют общий взгляд на риск аккаунта.",
        },
        {
          title: "Сборка",
          description:
            "Система готовит бриф с заметками владельца, историей поддержки и сроками контракта.",
        },
        {
          title: "Исполнение",
          description:
            "Задачи уходят нужным командам вместе с согласованиями и ответственностью.",
        },
      ],
    },
  },
};

const dictionaries = {
  en,
  ru,
} satisfies Record<Locale, SiteDictionary>;

export function getDictionary(locale: Locale): SiteDictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
