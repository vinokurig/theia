/*
 * Copyright (C) 2018 Ericsson and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject, named } from "inversify";
import { Command, MenuModelRegistry, CommandRegistry } from "@theia/core";
import { UserPreferenceProvider } from "./user-preference-provider";
import {
    open,
    OpenerService,
    CommonMenus,
    PreferenceScope,
    PreferenceProvider,
    AbstractViewContribution,
    PreferenceSchemaProvider, ApplicationShell
} from "@theia/core/lib/browser";
import { WorkspacePreferenceProvider } from './workspace-preference-provider';
import { FileSystem } from "@theia/filesystem/lib/common";
import { UserStorageService } from "@theia/userstorage/lib/browser";
import {PreferencesWidget, UserPreferencesWidget, WorkspacePreferencesWidget} from "./preferences-widget";
import { Widget } from "@phosphor/widgets";

export namespace PreferenceCommands {
    export const OPEN_USER_PREFERENCES: Command = {
        id: 'preferences:open_user',
        label: 'Open User Preferences'
    };
    export const OPEN_WORKSPACE_PREFERENCES: Command = {
        id: 'preferences:open_workspace',
        label: 'Open Workspace Preferences'
    };
}

export const USER_PREFERENCES_WIDGET_ID = 'user_preferences_widget';
export const WORKSPACE_PREFERENCES_WIDGET_ID = 'workspace_preferences_widget';

@injectable()
export class PreferencesFrontendContribution<T extends Widget> extends AbstractViewContribution<PreferencesWidget> {

    @inject(UserStorageService) protected readonly userStorageService: UserStorageService;
    @inject(PreferenceProvider) @named(PreferenceScope.User) protected readonly userPreferenceProvider: UserPreferenceProvider;
    @inject(PreferenceProvider) @named(PreferenceScope.Workspace) protected readonly workspacePreferenceProvider: WorkspacePreferenceProvider;
    @inject(OpenerService) protected readonly openerService: OpenerService;
    @inject(FileSystem) protected readonly filesystem: FileSystem;
    @inject(PreferenceSchemaProvider) protected readonly preferenceSchemaProvider: PreferenceSchemaProvider;

    constructor (@inject(ApplicationShell) protected readonly applicationShell: ApplicationShell) {
        super({
            widgetId: 'preferences_widget',
            widgetName: 'Preferences',
            defaultWidgetOptions: {area: 'main'}
        });
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(PreferenceCommands.OPEN_USER_PREFERENCES, {
            isEnabled: () => true,
            execute: () => this.openUserPreferences()
        });

        commands.registerCommand(PreferenceCommands.OPEN_WORKSPACE_PREFERENCES, {
            isEnabled: () => true,
            execute: () => this.openWorkspacePreferences()
        });
    }

    registerMenus(menus: MenuModelRegistry): void {
        menus.registerMenuAction(CommonMenus.FILE_OPEN, {
            commandId: PreferenceCommands.OPEN_USER_PREFERENCES.id
        });
        menus.registerMenuAction(CommonMenus.FILE_OPEN, {
            commandId: PreferenceCommands.OPEN_WORKSPACE_PREFERENCES.id
        });
    }

    async openPreferences(): Promise<PreferencesWidget> {
        const widget = await super.openView(undefined);
        widget.initializeModel();
        return widget;
    }

    protected async openUserPreferences(): Promise<void> {
        const userUri = this.userPreferenceProvider.getUri();
        const content = await this.userStorageService.readContents(userUri);
        if (content === "") {
            await this.userStorageService.saveContents(userUri, this.getPreferenceTemplateForScope('user'));
        }
        const size = this.applicationShell.mainPanel.node.offsetWidth;
        await open(this.openerService, userUri, {widgetOptions: {area: "right", mode: 'open'}});
        this.applicationShell.resize(size / 2, "right");
        this.openPreferences();
    }

    protected async openWorkspacePreferences(): Promise<void> {
        const wsUri = await this.workspacePreferenceProvider.getUri();
        if (!(await this.filesystem.exists(wsUri.toString()))) {
            await this.filesystem.createFile(wsUri.toString(), { content: this.getPreferenceTemplateForScope('workspace') });
        }
        const size = this.applicationShell.mainPanel.node.offsetWidth;
        await open(this.openerService, wsUri, {widgetOptions: {area: "right", mode: 'open'}});
        this.applicationShell.resize(size / 2, "right");
        this.openPreferences();
    }

    private getPreferenceTemplateForScope(scope: string): string {
        return `/*
Preference file for ${scope} scope

Please refer to the documentation online (https://github.com/theia-ide/theia/blob/master/packages/preferences/README.md) to learn how preferences work in Theia
*/`;
    }
}

export class UserPreferencesFrontendContribution extends PreferencesFrontendContribution<UserPreferencesWidget> {
    get widget(): Promise<UserPreferencesWidget> {
        return this.widgetManager.getOrCreateWidget<UserPreferencesWidget>(USER_PREFERENCES_WIDGET_ID);
    }
}

export class WorkspacePreferencesFrontendContribution extends PreferencesFrontendContribution<WorkspacePreferencesWidget> {
    get widget(): Promise<UserPreferencesWidget> {
        return this.widgetManager.getOrCreateWidget<WorkspacePreferencesWidget>(WORKSPACE_PREFERENCES_WIDGET_ID);
    }
}

// @injectable()
// export class WorkspacePreferencesFrontendContribution extends AbstractViewContribution<WorkspacePreferencesWidget> {
//
//     @inject(UserStorageService) protected readonly userStorageService: UserStorageService;
//     @inject(PreferenceProvider) @named(PreferenceScope.User) protected readonly userPreferenceProvider: UserPreferenceProvider;
//     @inject(PreferenceProvider) @named(PreferenceScope.Workspace) protected readonly workspacePreferenceProvider: WorkspacePreferenceProvider;
//     @inject(OpenerService) protected readonly openerService: OpenerService;
//     @inject(FileSystem) protected readonly filesystem: FileSystem;
//     @inject(PreferenceSchemaProvider) protected readonly preferenceSchemaProvider: PreferenceSchemaProvider;
//
//     constructor (@inject(ApplicationShell) protected readonly applicationShell: ApplicationShell) {
//         super({
//             widgetId: WORKSPACE_PREFERENCES_WIDGET_ID,
//             widgetName: 'Workspace Preferences',
//             defaultWidgetOptions: {area: 'main'}
//         });
//     }
//
//     registerCommands(commands: CommandRegistry): void {
//         commands.registerCommand(PreferenceCommands.OPEN_WORKSPACE_PREFERENCES, {
//             isEnabled: () => true,
//             execute: () => this.openWorkspacePreferences()
//         });
//     }
//
//     registerMenus(menus: MenuModelRegistry): void {
//         menus.registerMenuAction(CommonMenus.FILE_OPEN, {
//             commandId: PreferenceCommands.OPEN_WORKSPACE_PREFERENCES.id
//         });
//     }
//
//     async openPreferences(): Promise<WorkspacePreferencesWidget> {
//         const widget = await super.openView(undefined);
//         widget.initializeModel();
//         return widget;
//     }
//
//     protected async openWorkspacePreferences(): Promise<void> {
//         const wsUri = await this.workspacePreferenceProvider.getUri();
//         if (!(await this.filesystem.exists(wsUri.toString()))) {
//             await this.filesystem.createFile(wsUri.toString(), { content: getPreferenceTemplateForScope('workspace') });
//         }
//         const size = this.applicationShell.mainPanel.node.offsetWidth;
//         await open(this.openerService, wsUri, {widgetOptions: {area: "right", mode: 'open'}});
//         this.applicationShell.resize(size / 2, "right");
//         this.openPreferences();
//     }
// }
