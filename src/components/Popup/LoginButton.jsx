import React, { useState, useEffect } from 'react';
import { RcIconButton } from '@ringcentral/juno';
import { Login, Logout } from '@ringcentral/juno-icon';

export function LogInButton({
    rcSDK
}) {
    const [loggedIn, setLoggedIn] = useState(false);
    window.addEventListener("message", async (event) => {
        if (event.data && event.data.callbackUri) {
            const loginOptions = rcSDK.parseLoginRedirect(event.data.callbackUri);
            loginOptions['code_verifier'] = rcSDK.platform()._codeVerifier;

            chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                chrome.tabs.sendMessage(tabs[0].id, { loginOptions });
            });
        }
    }, false);

    return (
        <div>
            {
                loggedIn ? (
                    <RcIconButton
                        size='xsmall'
                        stretchIcon
                        color="danger.b04"
                        onClick={
                            async () => {
                                await rcSDK.platform().logout();
                                setLoggedIn(false);
                            }}
                        symbol={Logout}
                    />
                ) : (
                    <RcIconButton
                        size='xsmall'
                        stretchIcon
                        color="action.primary"
                        onClick=
                        {async () => {
                            var loginUrl = rcSDK.loginUrl({ usePKCE: true });
                            try {
                                await rcSDK.loginWindow({ url: loginUrl });
                                setLoggedIn(true);
                            } catch (e) {
                                console.error(e);
                            }
                        }}
                        symbol={Login}
                    />
                )}
        </div>
    )
}