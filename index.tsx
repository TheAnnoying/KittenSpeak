/*
* Vencord, a Discord client mod
* Copyright (c) 2024 Vendicated and contributors
* SPDX-License-Identifier: GPL-3.0-or-later
*/

import { addChatBarButton, ChatBarButton, removeChatBarButton } from "@api/ChatButtons";
import { addButton, removeButton } from "@api/MessagePopover";
import { InfoIcon } from "@components/Icons";
import { updateMessage } from "@api/MessageUpdater";
import { addPreSendListener, removePreSendListener } from "@api/MessageEvents";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { React, ChannelStore } from "@webpack/common";

const settings = definePluginSettings({
    strength: {
        type: OptionType.SLIDER,
        description: "How much should your message be changed?",
        default: 5,
        markers: [1, 2, 3, 4, 5]
    },
    showIcon: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show an icon for toggling the plugin",
    },
    isEnabled: {
        type: OptionType.BOOLEAN,
        description: "Toggle functionality",
        default: true
    }
});

const KittenToggle: ChatBarButton = () => {
    const { isEnabled, showIcon } = settings.use(["isEnabled", "showIcon"]);
    if (!showIcon) return null;

    return (
        <ChatBarButton
            tooltip={isEnabled ? "Disable Kitten Typing" : "Enable Kitten Typing"}
            onClick={() => settings.store.isEnabled = !settings.store.isEnabled}
        >
            <svg height="24px" width="24px" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                <g>
                    <path fill="currentColor" d="M461.814,197.514c-2.999-11.335-14.624-18.093-25.958-15.094c-1.866,0.553-13.477,3.649-26.042,14.341   c-6.234,5.349-12.633,12.751-17.361,22.454c-4.748,9.69-7.685,21.577-7.657,35.033c0.013,16.345,4.133,34.895,13.442,56.257   c6.282,14.403,9.144,29.697,9.144,44.846c0.062,25.627-8.438,50.756-21.121,68.283c-6.296,8.777-13.546,15.606-20.816,20.022   c-2.986,1.81-5.943,3.131-8.888,4.181l0.989-5.854c-0.055-17.03-4.05-34.84-13.021-50.528   c-28.356-49.643-66.223-134.741-66.223-134.741l-1.527-4.879c29.47-7.796,58.579-23.408,73.148-54.985   c38.931-84.344-41.08-142.73-41.08-142.73s-25.958-56.222-38.924-54.06c-12.978,2.164-41.094,38.931-41.094,38.931h-23.788h-23.788   c0,0-28.108-36.767-41.08-38.931c-12.979-2.163-38.924,54.06-38.924,54.06s-80.018,58.386-41.087,142.73   c13.822,29.953,40.741,45.572,68.634,53.748l-2.951,9.662c0,0-31.908,81.552-60.279,131.195C37.198,441.092,58.478,512,97.477,512   c29.47,0,79.14,0,101.692,0c7.292,0,11.763,0,11.763,0c22.544,0,72.222,0,101.691,0c12.654,0,23.38-7.547,31.204-19.324   c15.826-0.013,30.81-4.872,43.707-12.758c19.455-11.915,34.708-30.32,45.434-51.896c10.685-21.618,16.856-46.636,16.878-72.672   c0-20.484-3.885-41.619-12.682-61.813c-7.561-17.34-9.918-30.216-9.904-39.29c0.028-7.526,1.5-12.544,3.359-16.414   c1.417-2.889,3.124-5.17,4.983-7.091c2.771-2.868,5.964-4.879,8.349-6.054c1.182-0.595,2.135-0.968,2.674-1.162l0.449-0.152   l-0.007-0.028C458.179,220.189,464.779,208.724,461.814,197.514z" />
                    {!isEnabled && <path d="M13 432L590 48" stroke="var(--red-500)" stroke-width="72" stroke-linecap="round" />}
                </g>
            </svg>
        </ChatBarButton>
    );
};

const randomChance = (chance: number) => Math.random() < chance;
const randomElement = (array: any[]) => array[Math.floor(Math.random() * array.length)];

interface StrengthRule {
    rlConversion: number;
    repeatLetter: number;
    repeatLastLetter: number;
    suffixes: string[];
}

const strengthRules: StrengthRule[] = [
    { rlConversion: 0.4, repeatLetter: 0.02, repeatLastLetter: 0, suffixes: [" :3", " meow~", " owo", "~"] },
    { rlConversion: 0.5, repeatLetter: 0.03, repeatLastLetter: 0.2, suffixes: [" :3", " meow~", " nya~", " owo", " uwu", "~"] },
    { rlConversion: 0.6, repeatLetter: 0.04, repeatLastLetter: 0.4, suffixes: [" :3", " meow~", " nya~", " mrrp~", " purrr", " owo", " uwu", "~"] },
    { rlConversion: 0.7, repeatLetter: 0.05, repeatLastLetter: 0.6, suffixes: [" :3", " meow~", " nya~", " mrrp~", " purrr", " mew~", " hisss~", " owo", " uwu", "~"] },
    { rlConversion: 0.8, repeatLetter: 0.06, repeatLastLetter: 0.8, suffixes: [" :3", " meow~", " nya~", " mrrp~", " purrr", " nyan~", " mew~", " hisss~", " rawr~", " owo", " uwu", "~"] }
];

const ruleKeys: { [key: string]: string; } = {
    lConversion: "\u200B",
    rConversion: "\u200C",
    repeatLetter: "\u200D",
    repeatLastLetter: "\uFEFF",
    suffixes: "\u2060",
    kittenIndicator: "\u2063"
};

function applyKitten(content: string): string {
    const rules = strengthRules[settings.store.strength - 1];
    return content.split("").map((char, index) => {
        if (randomChance(rules.rlConversion)) {
            if (char.toLowerCase() === "l") return (char === char.toUpperCase() ? "W" : "w") + ruleKeys.lConversion;
            if (char.toLowerCase() === "r") return (char === char.toUpperCase() ? "W" : "w") + ruleKeys.rConversion;
        }
        if (randomChance(rules.repeatLetter) && char !== " ") return char.repeat(2) + ruleKeys.repeatLetter;
        if (randomChance(rules.repeatLastLetter) && content.split(" ").length < 3 && index === content.length - 1) return char.repeat(4) + ruleKeys.repeatLastLetter;
        return char;
    }).join("") + randomElement(rules.suffixes) + ruleKeys.suffixes + ruleKeys.kittenIndicator;
}

let messageList: { [key: number]: string; } = {};

function decodeKitten(content: string): string {
    let decodedString: string[] = [];
    content.split("").map(char => {
        const lastIndex = decodedString.length - 1;
        if (char === ruleKeys.lConversion) decodedString[lastIndex] = "l";
        else if (char === ruleKeys.rConversion) decodedString[lastIndex] = "r";
        else if (char === ruleKeys.repeatLetter) decodedString.splice(lastIndex - 1, 1);
        else if (char === ruleKeys.repeatLastLetter) decodedString.splice(lastIndex - 3, 3);
        else if (char === ruleKeys.suffixes) {
            const suffixLength = (strengthRules[4].suffixes.find(suffix => decodedString.join("").endsWith(suffix)))?.length ?? 0;
            decodedString.splice(-suffixLength);
        }
        else if (char !== ruleKeys.kittenIndicator) return decodedString.push(char.toLowerCase());
    });

    return decodedString.join("");
}

export default definePlugin({
    name: "KittenSpeak",
    description: "Make your messages sound like a cat~",
    authors: [{ name: "TheAnnoying", id: 588425966804533421n }],
    dependencies: ["MessageEventsAPI", "ChatInputButtonAPI", "MessagePopoverAPI"],
    settings,
    async start() {
        addButton("vc-kittenspeak-decoder", msg => {
            if (!msg.content.endsWith(ruleKeys.kittenIndicator)) return null;

            return {
                label: msg.id in messageList ? "Hide Original Message" : "Show Original Message",
                icon: InfoIcon,
                message: msg,
                channel: ChannelStore.getChannel(msg.channel_id),
                onClick: () => {
                    if (msg.id in messageList) {
                        msg.content = messageList[msg.id];
                        delete messageList[msg.id];
                    } else {
                        messageList[msg.id] = msg.content;
                        msg.content = decodeKitten(msg.content) + ruleKeys.kittenIndicator;
                    }

                    updateMessage(msg.channel_id, msg.id);
                }
            };
        });
        addChatBarButton("vc-kittenspeak", KittenToggle);
        this.preSend = addPreSendListener((_, msg) => {
            if (settings.store.isEnabled && msg.content.length > 0) msg.content = applyKitten(msg.content);
        });
    },
    stop() {
        messageList = {};
        removeButton("vc-kittensepak-decoder");
        removeChatBarButton("vc-kittenspeak");
        removePreSendListener(this.preSend);
    }
});