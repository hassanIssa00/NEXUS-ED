export const EMAIL_ACTION_CONTINUE_PATHS = {
    verified: '/en/auth/action?result=verified',
    passwordReset: '/en/auth/action?result=password-reset',
} as const;

export function getEmailActionSettings(continuePath: string = EMAIL_ACTION_CONTINUE_PATHS.verified) {
    if (typeof window === 'undefined') {
        throw new Error('Email action links can only be created in a browser.');
    }

    return {
        url: new URL(continuePath, window.location.origin).toString(),
        handleCodeInApp: false,
    };
}
