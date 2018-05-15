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
import {GitPreferences} from "@theia/git/lib/browser/git-preferences";
import {EditorManager} from "@theia/editor/lib/browser";
import URI from "@theia/core/lib/common/uri";
import {ApplicationShell} from "@theia/core/lib/browser";

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
    private widget1: any;
    protected preferencesGroups: PreferenceGroup[];
    constructor (@inject(EditorPreferences) protected readonly editorPreferences: EditorPreferences,
                 @inject(GitPreferences) protected readonly gitPreferences: GitPreferences,
                 @inject(EditorManager) protected readonly editorManager: EditorManager,
                 @inject(ApplicationShell) protected readonly applicationShell: ApplicationShell,
                 @inject(PreferenceService) protected readonly preferenceService: PreferenceService) {
        super();
        this.id = "theia-preferences-container";
        this.title.label = 'Prefernces';
        this.title.closable = true;
        this.addClass('theia-preferences');
        this.preferencesGroups = [];

        const promise = this.editorManager.open(
            new URI()
                .withScheme("file")
                .withPath("/home/ivinokur/.theia/settings.json"), {
                mode: "activate",
                widgetOptions: {area: "right"}
            }
        );
        promise.then(widget => {
            this.widget1 = widget;
            this.update();
        });
        this.update();
    }

    protected onCloseRequest(msg: Message): void {
        if (this.widget1) {
            this.widget1.close();
        }
        this.applicationShell.collapsePanel("right");
        super.onCloseRequest(msg);
    }

    protected onActivateRequest(msg: Message): void {
        super.onActivateRequest(msg);
        const editorPreferences: Preference[] = [];
        const gitPreferences: Preference[] = [];
        for (const p in this.editorPreferences) {
            if (p) {
                editorPreferences.push({name: p, value: this.preferenceService.get(p)});
            }
        }
        for (const p in this.gitPreferences) {
            if (p) {
                gitPreferences.push({name: p, value: this.preferenceService.get(p)});
            }
        }
        this.preferencesGroups.push({
            name: "Editor Preferences",
            preferences: editorPreferences,
            isExpanded: false
        });
        this.preferencesGroups.push({
            name: "Git Preferences",
            preferences: gitPreferences,
            isExpanded: false
        });
        this.update();
    }

    protected render(): h.Child {
        const preferenceGroups = [];
        for (const preferenceGroup of this.preferencesGroups) {
            preferenceGroups.push(this.renderPreferenceGroup(preferenceGroup));
        }
        return h.div({ className: "preferences-container" }, ...preferenceGroups);
    }

    protected renderPreferenceGroup(group: PreferenceGroup): h.Child {
        return h.div({
                className: "preference-group"
            },
            h.div({className: "toggle",
                    onclick: () => {
                        group.isExpanded = !group.isExpanded;
                        this.update();
                    }
                },
                h.div({className: "number"}, group.name),
                h.div({className: group.isExpanded ? "icon fa fa-caret-down" : "icon fa fa-caret-right"})
            ), group.isExpanded ? this.renderPreferencesList(group.preferences) : "");
    }

    protected renderPreferencesList(preferences: Preference[]): h.Child {
        const files: h.Child[] = [];
        for (const preference of preferences) {
            files.push(this.renderPreferenceItem(preference));
        }
        const commitFiles = h.div({ className: "preferences-list" }, ...files);
        return h.div({ className: "preference-body" }, commitFiles);
    }

    protected renderPreferenceItem(preference: Preference): h.Child {
        const nameSpan = h.span({className: 'name'}, preference.name + ' ');
        const valueSpan = h.span({className: 'path'}, preference.value);
        const button = h.i({
            className: "icon fa fa-pencil",
            title: "Edit",
            onclick: () => {
                this.update();
            }
        });
        const elements = [];
        const buttonContainer = h.div({
            className: 'preference-item-button'
        }, button);
        const buttonsContainer = h.div({
            className: 'preference-item-buttons'
        }, buttonContainer);
        elements.push(buttonsContainer, nameSpan, valueSpan);
        return h.div({
            className: 'preference-item-container',
            title: preference.name,
        }, ...elements);
    }
}
