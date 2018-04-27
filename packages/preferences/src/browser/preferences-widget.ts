/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject } from "inversify";
import { VirtualWidget } from "@theia/core/lib/browser/widgets/virtual-widget";
import { Message } from "@phosphor/messaging";
import { h } from '@phosphor/virtualdom';
import { EditorPreferences } from "@theia/editor/lib/browser/editor-preferences";
import {PreferenceService} from "../../../core/lib/browser/preferences/preference-service";

export interface PreferenceGroup {
    name: string;
    preferences: Preference[];
    isExpanded: boolean;
}

export interface Preference {
    name: string;
    value: any;
}

export class PreferencesWidget extends VirtualWidget {
    protected preferencesGroups: PreferenceGroup[];

    constructor (@inject(EditorPreferences) protected readonly editorPreferences: EditorPreferences,
                 @inject(PreferenceService) protected readonly preferenceService: PreferenceService) {
        super();
        this.id = "theia-preferences-container";
        this.title.label = 'Prefernces';
        this.title.closable = true;
        this.addClass('theia-preferences');
        this.preferencesGroups = [];
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        const preferences: Preference[] = [];
        for (const key of Object.keys(this.editorPreferences)) {
            const value = this.preferenceService.get(key);
            preferences.push({name: key, value: value});
        }
        this.preferencesGroups.push({
            name: "preference_name",
            preferences: preferences,
            isExpanded: false
        });
        this.preferencesGroups.push({
            name: "preference_name1",
            preferences: preferences,
            isExpanded: false
        });
        this.update();
    }

    protected onUpdateRequest(msg: Message): void {
        super.onUpdateRequest(msg);
    }

    protected render(): h.Child {
        const containers = [];
        for (const preferenceGroup of this.preferencesGroups) {
            containers.push(this.renderPreferenceGroup(preferenceGroup));
        }
        return h.div({ className: "preferences-container" }, ...containers);
    }

    protected renderPreferenceGroup(group: PreferenceGroup): h.Child {
        return h.div({
                className: "expansionToggle noselect",
                onclick: () => {
                    group.isExpanded = !group.isExpanded;
                    this.update();
                }
            },
            h.div({className: "toggle"},
                h.div({className: "number"}, (group.name)),
                h.div({className: "icon fa fa-folder"})
            ), group.isExpanded ? this.renderPreferencesList(group.preferences) : "");
    }

    protected renderPreferencesList(preferences: Preference[]): h.Child {
        const files: h.Child[] = [];
        for (const preference of preferences) {
            files.push(this.renderPreferenceItem(preference));
        }
        const commitFiles = h.div({ className: "commitFileList" }, ...files);
        return h.div({ className: "commitBody" }, commitFiles);
    }

    protected renderPreferenceItem(preference: Preference): h.Child {
        const nameSpan = h.span({ className: 'name' }, preference.name + ' ');
        const valueSpan = h.span({ className: 'path' }, preference.value);
        const elements = [];
        elements.push(h.div({
            title: preference.name,
            className: 'noWrapInfo'
        }, nameSpan, valueSpan));
        return h.div({ className: `preferenceItem noselect${preference.name}` }, ...elements);
    }
}
