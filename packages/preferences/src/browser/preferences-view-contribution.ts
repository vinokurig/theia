/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import {
    AbstractViewContribution, ApplicationShell,
    FrontendApplication,
    OpenerService,
    PreferenceProvider, PreferenceScope,
    WidgetManager
} from "@theia/core/lib/browser";
import {PreferencesWidget} from "./preferences-widget";
import {inject, named} from "inversify";
import {Command, CommandRegistry, MessageService, SelectionService} from "@theia/core";
import {FileSystem} from "@theia/filesystem/lib/common";
import {UserStorageService} from "../../../userstorage/lib/browser";
import { UserPreferenceProvider } from "./user-preference-provider";

export const PREFERENCES_WIDGET_ID = 'preferences_widget';

export namespace PreferencesCommands {
    export const OPEN_WIDGET: Command = {
        id: 'preferences:widget',
        label: 'Preferences: Open widget ...'
    };
}

export class PreferencesViewContribution extends AbstractViewContribution<PreferencesWidget> {
    constructor(
        @inject(UserStorageService) protected readonly userStorageService: UserStorageService,
        @inject(PreferenceProvider) @named(PreferenceScope.User) protected readonly userPreferenceProvider: UserPreferenceProvider,
        @inject(SelectionService) protected readonly selectionService: SelectionService,
        @inject(WidgetManager) protected readonly widgetManager: WidgetManager,
        @inject(FrontendApplication) protected readonly app: FrontendApplication,
        @inject(FileSystem) protected readonly fileSystem: FileSystem,
        @inject(ApplicationShell) protected readonly applicationShell: ApplicationShell,
        @inject(OpenerService) protected readonly openerService: OpenerService,
        @inject(MessageService) protected readonly notifications: MessageService
    ) {
        super({
            widgetId: PREFERENCES_WIDGET_ID,
            widgetName: 'Preferences',
            defaultWidgetOptions: {
                area: 'main',
                mode: 'split-right',
                rank: 500
            },
            toggleKeybinding: 'ctrlcmd+shift+y'
        });
    }

    async showWidget(): Promise<PreferencesWidget> {
        const widget = await this.widget;
        await widget.update();
        return this.openView({
            activate: true
        });
    }

    registerCommands(commands: CommandRegistry): void {
        commands.registerCommand(PreferencesCommands.OPEN_WIDGET, {
            execute: async () => {
                const userUri = this.userPreferenceProvider.getUri();
                // const content = await this.userStorageService.readContents(userUri);
                // if (content === "") {
                //     await this.userStorageService.saveContents(userUri, this.getPreferenceTemplateForScope('user'));
                // }

                const size = this.applicationShell.mainPanel.node.offsetWidth;
                const opener = await this.openerService.getOpener(userUri);
                await opener.open(userUri, {widgetOptions: {area: "right", mode: 'open'}});
                this.applicationShell.resize(size / 2, "right");
                this.showWidget();
            }
        });
    }
}
